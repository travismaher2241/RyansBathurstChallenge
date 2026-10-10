import urllib.request,urllib.parse,json,concurrent.futures,pathlib
P=pathlib.Path('reconstruction/raw')
def get(n,u,p):
 try:
  b=urllib.request.urlopen(u+'?'+urllib.parse.urlencode(p),timeout=50).read();(P/n).write_bytes(b);j=json.loads(b);print(n,'features',len(j.get('features',[])),'error',j.get('error'),flush=True)
 except Exception as e:print(e,flush=True)
base='https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Transport_Theme/FeatureServer'
get('circuit_roads.json',base+'/5/query',{'f':'json','where':"roadnamebase IN ('MOUNTAIN STRAIGHT','CONROD STRAIGHT','BROCKS SKYLINE','PIT STRAIGHT')",'outSR':4326,'outFields':'*','returnGeometry':'true','resultRecordCount':2000})
