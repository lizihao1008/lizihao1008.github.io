#!/usr/bin/env python3
"""
Fetch ADS citation histograms and publication list.
Based on ads_metrics.py — writes data/citations.json and data/publications.json.

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
API_SEARCH = "https://api.adsabs.harvard.edu/v1/search/query"
API_METRICS = "https://api.adsabs.harvard.edu/v1/metrics"


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


def ads_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


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


def split_publications(docs: list[dict], first_author_name: str) -> tuple[list, list, int, int]:
    first_author_papers = []
    second_author_papers = []
    for doc in docs:
        paper = parse_paper(doc)
        authors = paper.get("authors") or []
        if authors and authors[0] == first_author_name:
            first_author_papers.append(paper)
        else:
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


def build_citations_payload(histogram: dict, first_author: int, contributing: int) -> dict:
    r1 = histogram.get("refereed to nonrefereed", {})
    r2 = histogram.get("refereed to refereed", {})
    n1 = histogram.get("nonrefereed to nonrefereed", {})
    n2 = histogram.get("nonrefereed to refereed", {})

    years = sorted(set(r1.keys()) | set(r2.keys()) | set(n1.keys()) | set(n2.keys()), key=int)

    def aligned_sum(a: dict, b: dict) -> list:
        return [int(a.get(y, 0)) + int(b.get(y, 0)) for y in years]

    refereed = aligned_sum(r1, r2)
    nonrefereed = aligned_sum(n1, n2)

    return {
        "years": years,
        "refereed": refereed,
        "nonrefereed": nonrefereed,
        "first_author": first_author,
        "contributing": contributing,
        "time": datetime.now(timezone.utc).strftime("%m/%d/%Y"),
        "source": "NASA ADS",
    }


def main() -> None:
    token = os.environ.get("ADS_TOKEN")
    if not token:
        print("ADS_TOKEN not set. Skipping fetch.", file=sys.stderr)
        sys.exit(0)

    config = load_config()
    first_author_name = config.get("first_author_name", "Li, Zihao")

    print("Fetching papers from ADS…")
    docs = fetch_papers(config, token)
    first_papers, second_papers, n_first, n_contrib = split_publications(
        docs, first_author_name
    )

    bibcodes = [d["bibcode"] for d in docs if d.get("bibcode")]
    print(f"Found {len(docs)} papers ({n_first} first-author, {n_contrib} co-author).")
    print("Fetching citation histogram…")
    histogram = fetch_citation_histogram(bibcodes, token)
    cite_payload = build_citations_payload(histogram, n_first, n_contrib)

    updated = datetime.now(timezone.utc).isoformat()
    pub_payload = {
        "updated_at": updated,
        "first_author": first_papers,
        "second_author": second_papers,
    }

    CITATIONS_OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(CITATIONS_OUT, "w", encoding="utf-8") as f:
        json.dump(cite_payload, f, indent=2, cls=NpEncoder, ensure_ascii=False)
    with open(PUBLICATIONS_OUT, "w", encoding="utf-8") as f:
        json.dump(pub_payload, f, indent=2, ensure_ascii=False)

    print(f"Wrote {CITATIONS_OUT}")
    print(f"Wrote {PUBLICATIONS_OUT}")


if __name__ == "__main__":
    main()
