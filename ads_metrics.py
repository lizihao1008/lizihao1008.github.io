import requests
import json
from urllib.parse import urlencode, quote_plus
import numpy as np
from datetime import datetime
nowTime = datetime.now().strftime('%m/%d/%Y')

class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return json.JSONEncoder.default(self, obj)
    

token='lMejssLpFCj1GqoQfnEjE0HIRBnzXetHHCSLwbdY'

encoded_query = urlencode({"q": "orcid_other:0000-0001-5951-459X",
                           "fl": "title, bibcode, author",
                           "rows": 100
                          })
results = requests.get("https://api.adsabs.harvard.edu/v1/search/query?{}".format(encoded_query), \
                       headers={'Authorization': 'Bearer ' + token})



# format the response in a nicely readable format
results = results.json()
first_author = sum([1 if results['response']['docs'][i]['author'][0] == 'Li, Zihao' else 0 for i in range(len(results['response']['docs']))])
contributing = len(results['response']['docs']) - first_author

docs = results['response']['docs']
bibcodes = [docs[i]['bibcode'] for i in range(len(docs))]
payload = {"bibcodes": bibcodes,
          "types": ["histograms"],
          "histograms": ["citations"]}
results = requests.post("https://api.adsabs.harvard.edu/v1/metrics", \
                       headers={'Authorization': 'Bearer ' + token, 
                                "Content-type": "application/json"}, \
                       data=json.dumps(payload))
results = results.json()
refereed1 = results['histograms']['citations']['refereed to nonrefereed']
refereed2 = results['histograms']['citations']['refereed to refereed']
years = list(refereed1.keys())
nonrefereed1 = results['histograms']['citations']['nonrefereed to nonrefereed']
nonrefereed2 = results['histograms']['citations']['nonrefereed to refereed']

refereed1 = np.array(list(refereed1.values()))
refereed2 = np.array(list(refereed2.values()))
refereed = refereed1+refereed2

nonrefereed1 = np.array(list(nonrefereed1.values()))
nonrefereed2 = np.array(list(nonrefereed2.values()))
nonrefereed = nonrefereed1+nonrefereed2

results['histograms']['citations']['refereed'] = refereed
results['histograms']['citations']['nonrefereed'] = nonrefereed
results['histograms']['citations']['years'] = years
results['histograms']['citations']['first_author'] = first_author
results['histograms']['citations']['contributing'] = contributing
results['histograms']['citations']['time'] = nowTime
json_object = json.dumps(results['histograms']['citations'], indent=4,cls=NpEncoder)
with open("citations.json", "w") as outfile:
    outfile.write(json_object)