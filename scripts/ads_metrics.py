#!/usr/bin/env python3
"""
Fetch ADS citation histograms and publication lists.
Writes data/citations.json, data/publications.json, and data/others.json.

- publications.json: ORCID search + optional extra public library (merged into first/second author)
- others.json: separate curated public library for "Other Selected" on the homepage

Usage:
  export ADS_TOKEN="your-token"
  python scripts/ads_metrics.py
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

import numpy as np
import requests

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config" / "ads_config.json"
CITATIONS_OUT = ROOT / "data" / "citations.json"
PUBLICATIONS_OUT = ROOT / "data" / "publications.json"
OTHERS_OUT = ROOT / "data" / "others.json"
API_SEARCH = "https://api.adsabs.harvard.edu/v1/search/query"
API_METRICS = "https://api.adsabs.harvard.edu/v1/metrics"
API_LIBRARY = "https://api.adsabs.harvard.edu/v1/biblib/libraries"


class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super().default(obj)


def load_config() -> dict:
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)


def author_aliases(config: dict) -> list[str]:
    primary = config.get("first_author_name", "Li, Zihao")
    variants = config.get("author_name_variants") or []
    names = [primary, *variants]
    seen: set[str] = set()
    unique: list[str] = []
    for name in names:
        key = name.strip().lower()
        if key and key not in seen:
            seen.add(key)
            unique.append(name.strip())
    return unique


def author_matches(candidate: str, aliases: list[str]) -> bool:
    c = candidate.strip().lower()
    return any(c == alias.strip().lower() for alias in aliases)


def ads_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def fetch_library_docs(library_id: str, token: str, max_rows: int = 200) -> list[dict]:
    """Fetch raw ADS Solr docs from a public/private library."""
    params = {
        "fl": "title,bibcode,author,year,pub,doi,identifier,pubdate,citation_count",
        "rows": max_rows,
        "sort": "date desc",
    }
    resp = requests.get(
        f"{API_LIBRARY}/{library_id}?{urlencode(params)}",
        headers=ads_headers(token),
        timeout=90,
    )
    resp.raise_for_status()
    payload = resp.json()
    docs = payload.get("solr", {}).get("response", {}).get("docs", [])
    if not docs:
        docs = [{"bibcode": bc} for bc in payload.get("documents") or []]
    return docs


def fetch_library_papers(library_id: str, token: str, max_rows: int = 200) -> list[dict]:
    """Fetch parsed papers from an ADS public/private library."""
    return [parse_paper(doc) for doc in fetch_library_docs(library_id, token, max_rows)]


def merge_docs(existing: list[dict], extra: list[dict]) -> list[dict]:
    """Append library docs not already present (by bibcode)."""
    seen = {d.get("bibcode") for d in existing if d.get("bibcode")}
    merged = list(existing)
    for doc in extra:
        bibcode = doc.get("bibcode")
        if bibcode and bibcode in seen:
            continue
        merged.append(doc)
        if bibcode:
            seen.add(bibcode)
    return merged


def fetch_papers(config: dict, token: str) -> list[dict]:
    q = config.get("author_query") or f"orcid:{config['orcid']}"
    rows = config.get("max_papers", 200)
    params = {
        "q": q,
        "fl": "title,bibcode,author,year,pub,doi,identifier,pubdate,citation_count",
        "rows": rows,
        "sort": "date desc",
    }
    resp = requests.get(
        f"{API_SEARCH}?{urlencode(params)}",
        headers=ads_headers(token),
        timeout=90,
    )
    resp.raise_for_status()
    return resp.json().get("response", {}).get("docs", [])


def parse_paper(doc: dict) -> dict:
    title = doc.get("title")
    if isinstance(title, list):
        title = title[0] if title else ""
    doi = doc.get("doi")
    if isinstance(doi, list):
        doi = doi[0] if doi else None
    year = doc.get("year")
    if not year and doc.get("pubdate"):
        year = str(doc["pubdate"])[:4]
    arxiv_id = None
    for ident in doc.get("identifier") or []:
        if "arXiv:" in str(ident):
            arxiv_id = str(ident).replace("arXiv:", "").strip()
            break
    return {
        "title": title or "Untitled",
        "authors": doc.get("author") or [],
        "year": year,
        "journal": doc.get("pub") or "",
        "bibcode": doc.get("bibcode", ""),
        "doi": doi,
        "arxiv_id": arxiv_id,
        "citation_count": doc.get("citation_count", 0),
    }


def author_position(authors: list[str], aliases: list[str]) -> int | None:
    """Return 1-based author position, or None if not in author list."""
    for i, name in enumerate(authors):
        if author_matches(name, aliases):
            return i + 1
    return None


def split_publications(
    docs: list[dict], aliases: list[str]
) -> tuple[list[dict], list[dict], int, int]:
    first_author_papers: list[dict] = []
    second_author_papers: list[dict] = []

    for doc in docs:
        paper = parse_paper(doc)
        authors = paper.get("authors") or []
        pos = author_position(authors, aliases)
        if pos == 1:
            first_author_papers.append(paper)
        elif pos == 2:
            second_author_papers.append(paper)

    return (
        first_author_papers,
        second_author_papers,
        len(first_author_papers),
        len(second_author_papers),
    )


def fetch_citation_histogram(bibcodes: list[str], token: str) -> dict:
    if not bibcodes:
        return {
            "years": [],
            "refereed": [],
            "nonrefereed": [],
        }
    payload = {
        "bibcodes": bibcodes,
        "types": ["histograms"],
        "histograms": ["citations"],
    }
    resp = requests.post(
        API_METRICS,
        headers={**ads_headers(token), "Content-Type": "application/json"},
        data=json.dumps(payload),
        timeout=90,
    )
    resp.raise_for_status()
    return resp.json()["histograms"]["citations"]


def build_citations_payload(
    histogram: dict, first_author: int, second_author: int
) -> dict:
    r1 = histogram.get("refereed to nonrefereed", {})
    r2 = histogram.get("refereed to refereed", {})
    n1 = histogram.get("nonrefereed to nonrefereed", {})
    n2 = histogram.get("nonrefereed to refereed", {})

    years = sorted(
        set(r1.keys()) | set(r2.keys()) | set(n1.keys()) | set(n2.keys()), key=int
    )

    def aligned_sum(a: dict, b: dict) -> list:
        return [int(a.get(y, 0)) + int(b.get(y, 0)) for y in years]

    refereed = aligned_sum(r1, r2)
    nonrefereed = aligned_sum(n1, n2)

    return {
        "years": years,
        "refereed": refereed,
        "nonrefereed": nonrefereed,
        "first_author": first_author,
        "second_author": second_author,
        "contributing": second_author,
        "time": datetime.now(timezone.utc).strftime("%m/%d/%Y"),
        "source": "NASA ADS",
    }


def resolve_token() -> str | None:
    token = os.environ.get("ADS_TOKEN")
    if token:
        return token.strip()
    token_path = ROOT / "config" / ".ads_token"
    if token_path.is_file():
        return token_path.read_text(encoding="utf-8").strip()
    return None


def main() -> None:
    token = resolve_token()
    if not token:
        print("ADS_TOKEN not set. Skipping fetch.", file=sys.stderr)
        sys.exit(1 if os.environ.get("CI") else 0)

    config = load_config()
    aliases = author_aliases(config)

    print("Fetching papers from ADS…")
    docs = fetch_papers(config, token)

    extra_library_id = config.get("extra_public_library_id")
    extra_library_url = config.get("extra_public_library_url")
    if extra_library_id:
        print(f"Merging extra public library {extra_library_id} into publications…")
        extra_docs = fetch_library_docs(
            extra_library_id,
            token,
            max_rows=config.get("max_library_papers", 200),
        )
        before = len(docs)
        docs = merge_docs(docs, extra_docs)
        print(f"Added {len(docs) - before} papers from extra library.")

    first_papers, second_papers, n_first, n_second = split_publications(docs, aliases)

    bibcodes = [d["bibcode"] for d in docs if d.get("bibcode")]
    print(
        f"Found {len(docs)} papers ({n_first} first-author, {n_second} second-author)."
    )
    print("Fetching citation histogram…")
    histogram = fetch_citation_histogram(bibcodes, token)
    cite_payload = build_citations_payload(histogram, n_first, n_second)

    others_library_id = config.get("others_library_id")
    others_library_url = config.get("others_library_url")
    other_papers: list[dict] = []
    if others_library_id:
        print(f"Fetching others library {others_library_id}…")
        other_papers = fetch_library_papers(
            others_library_id,
            token,
            max_rows=config.get("max_library_papers", 200),
        )
        print(f"Found {len(other_papers)} papers for others.json.")

    updated = datetime.now(timezone.utc).isoformat()
    pub_payload = {
        "updated_at": updated,
        "source": "NASA ADS",
        "first_author": first_papers,
        "second_author": second_papers,
        "extra_library_id": extra_library_id,
        "extra_library_url": extra_library_url,
    }
    others_payload = {
        "updated_at": updated,
        "source": "NASA ADS public library",
        "library_id": others_library_id,
        "library_url": others_library_url,
        "papers": other_papers,
    }

    CITATIONS_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(CITATIONS_OUT, "w", encoding="utf-8") as f:
        json.dump(cite_payload, f, indent=2, cls=NpEncoder, ensure_ascii=False)
    with open(PUBLICATIONS_OUT, "w", encoding="utf-8") as f:
        json.dump(pub_payload, f, indent=2, ensure_ascii=False)
    with open(OTHERS_OUT, "w", encoding="utf-8") as f:
        json.dump(others_payload, f, indent=2, ensure_ascii=False)

    print(f"Wrote {CITATIONS_OUT}")
    print(f"Wrote {PUBLICATIONS_OUT}")
    print(f"Wrote {OTHERS_OUT}")


if __name__ == "__main__":
    main()
