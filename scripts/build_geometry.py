import json,numpy as np,math,sys
SIGMA=float(sys.argv[1]) if len(sys.argv)>1 else 12.0
from scipy.interpolate import CubicSpline
from scipy.ndimage import gaussian_filter1d
from scipy.signal import find_peaks
from pathlib import Path
P=Path('reconstruction');fs=json.load(open(P/'raw/circuit_roads.json'))['features']
# walk endpoint-connected closed loop from Hell Corner southwards (anticlockwise).
start=np.array([149.55580074757202,-33.43895659761849]);cur=start;unused=list(fs);pts=[];ids=[]
while unused:
 options=[]
 for f in unused:
  p=np.array(f['geometry']['paths'][0]);options.extend([(np.linalg.norm(p[0]-cur),f,False),(np.linalg.norm(p[-1]-cur),f,True)])
 # first choose Mountain Straight; thereafter nearest unused endpoint
 if not pts:options=[o for o in options if o[1]['attributes']['roadnamebase']=='MOUNTAIN STRAIGHT']
 d,f,rev=min(options,key=lambda o:o[0]);assert d<1e-7,(d,f['attributes']['objectid']);p=np.array(f['geometry']['paths'][0]);p=p[::-1] if rev else p
 pts.extend(p if not pts else p[1:]);ids.append(f['attributes']['objectid']);cur=p[-1];unused.remove(f)
assert np.linalg.norm(cur-start)<1e-8
ll=np.array(pts);lat0=math.radians(-33.448);lon0=149.557;latref=-33.4393
# ellipsoidal local tangent approximation, ~2 km field, no WebMercator length distortion
A=6378137.;e2=6.69437999014e-3;N=A/math.sqrt(1-e2*math.sin(lat0)**2);M=A*(1-e2)/(1-e2*math.sin(lat0)**2)**1.5
xy=np.column_stack(((ll[:,0]-lon0)*math.pi/180*N*math.cos(lat0),(ll[:,1]-latref)*math.pi/180*M))
d=np.linalg.norm(np.diff(xy,axis=0),axis=1);q=np.r_[0,np.cumsum(d)];length=q[-1]
# preserve polyline, densify then symmetric periodic 8m Gaussian smoothing to round mapped vertices
step=1.;n=round(length);u=np.linspace(0,length,n,endpoint=False);v=np.column_stack([np.interp(u,q,xy[:,k]) for k in range(2)])
v=gaussian_filter1d(v,SIGMA/(length/n),axis=0,mode='wrap');v=np.vstack([v,v[0]]);vl=np.r_[0,np.cumsum(np.linalg.norm(np.diff(v,axis=0),axis=1))]
# locate approx timing line independently from official map on Pit Straight
ref=np.array([(149.55835-lon0)*math.pi/180*N*math.cos(lat0),(-33.43931-latref)*math.pi/180*M]);offset=np.argmin(np.linalg.norm(v[:-1]-ref,axis=1));original_offset=float(vl[offset]);v=np.roll(v[:-1],-offset,axis=0);v=np.vstack([v,v[0]]);vl=np.r_[0,np.cumsum(np.linalg.norm(np.diff(v,axis=0),axis=1))];L=vl[-1]
cs=CubicSpline(vl,v,bc_type='periodic');s=np.linspace(0,6213,6214);t=s/6213*L;x=cs(t);xp=cs(t,1);xpp=cs(t,2)
k=(xp[:,0]*xpp[:,1]-xp[:,1]*xpp[:,0])/(np.linalg.norm(xp,axis=1)**3)
# east/north coordinate positive mathematical curvature=left. game heading positive clockwise=right
heading=np.unwrap(np.arctan2(xp[:,0],xp[:,1]));kg=-k*L/6213
lat=latref+x[:,1]/M*180/math.pi;lon=lon0+x[:,0]/(N*math.cos(lat0))*180/math.pi
np.savez(P/'geometry.npz',s=s,xy=x,lon=lon,lat=lat,k=kg,heading=heading,source_s=t)
meta={'horizontal_smoothing_sigma_m':SIGMA,'source_vertex_count':len(ll),'source_feature_count':len(fs),'feature_order':ids,'raw_polyline_length_m':length,'smoothed_length_m':L,'chainage_scale':6213/L,'origin_lon':lon0,'origin_lat':latref,'projection':'WGS84 ellipsoidal local tangent approximation','N':N,'M':M,'latitude_scale_radians':lat0,'timing_offset_along_original_loop_m':original_offset,'timing_line_estimate_lon':float(lon[0]),'timing_line_estimate_lat':float(lat[0])}
(P/'geometry_metadata.json').write_text(json.dumps(meta,indent=2));print(meta)
peaks,_=find_peaks(abs(kg[:-1]),prominence=.001,distance=25)
for i in peaks:print('PEAK',i,'R' if kg[i]>0 else 'L',round(1/abs(kg[i]),1),round(lon[i],7),round(lat[i],7))
