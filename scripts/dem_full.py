import urllib.request,urllib.parse,json,pathlib
P=pathlib.Path('reconstruction/raw');base='https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_5M_Elevation/ImageServer'
p={'f':'json','bbox':'149.535,-33.461,149.566,-33.437','bboxSR':4326,'imageSR':3857,'size':'691,641','format':'tiff','pixelType':'F32','noData':-9999,'interpolation':'RSP_BilinearInterpolation'}
b=urllib.request.urlopen(base+'/exportImage?'+urllib.parse.urlencode(p),timeout=55).read();(P/'dem_full_response.json').write_bytes(b);j=json.loads(b);print(j,flush=True)
u=j['href'].replace('http:','https:');b=urllib.request.urlopen(u,timeout=55).read();(P/'nsw_dem_full.tiff').write_bytes(b);print('downloaded',len(b),flush=True)
