from pathlib import Path
import numpy as np,json,csv,math,hashlib,zipfile,shutil,datetime
from PIL import Image
from scipy.ndimage import map_coordinates,gaussian_filter1d
from scipy.spatial import cKDTree
from scipy.signal import find_peaks
import matplotlib.pyplot as plt
P=Path('reconstruction');D=P/'data';D.mkdir(exist_ok=True)
g=np.load(P/'geometry.npz');meta=json.load(open(P/'geometry_metadata.json'));s=g['s'];xy=g['xy'];k=g['k'];h=g['heading'];L=6213
im=Image.open(P/'raw/nsw_dem_full.tiff');dem=np.array(im,dtype=float);ext=json.load(open(P/'raw/dem_full_response.json'))['extent']
def elev(lon,lat):
 mx=6378137*np.deg2rad(lon);my=6378137*np.log(np.tan(np.pi/4+np.deg2rad(lat)/2));cx=(mx-ext['xmin'])/(ext['xmax']-ext['xmin'])*dem.shape[1]-.5;cy=(ext['ymax']-my)/(ext['ymax']-ext['ymin'])*dem.shape[0]-.5
 return map_coordinates(dem,[np.atleast_1d(cy),np.atleast_1d(cx)],order=1,mode='constant',cval=np.nan)
zraw=elev(g['lon'],g['lat']);assert np.all(np.isfinite(zraw)) and np.all(zraw>0)
z=gaussian_filter1d(zraw[:-1],12,mode='wrap');z=np.r_[z,z[0]];grad=np.r_[(np.roll(z[:-1],-1)-np.roll(z[:-1],1))/2,0];grad[-1]=grad[0]
cal_factor=174/(max(z)-min(z));zcal=688+(z-min(z))*cal_factor;scale=meta['chainage_scale'];gamexy=(xy-xy[0])*scale
zones=[(0,202,'Pit Straight','pit',12),(202,296,'Hell Corner','lower',12),(296,1303,'Mountain Straight','rural_climb',10),(1303,1515,"Griffin’s Bend",'rural_climb',10),(1515,1955,'The Cutting','rock_cutting',8.5),(1955,2340,'Reid Park','mountain_camp',9),(2340,2730,'Sulman Park','mountain_camp',9),(2730,3130,'McPhillamy Park','mountain_camp',9),(3130,3220,"Brock’s Skyline",'skyline',8.5),(3220,3510,'The Esses / Dipper','walled_descent',8.5),(3510,3835,"Forrest’s Elbow approach and exit",'walled_descent',8.5),(3835,5050,'Conrod Straight','rural_descent',12),(5050,5560,'The Chase','chase',12),(5560,5900,'Conrod lower run','lower',12),(5900,6010,"Murray’s Corner",'lower',12),(6010,6214,'Pit Straight','pit',12)]
def zone(i):return next(q for q in zones if q[0]<=i<q[1])
def num(v,n=6):return round(float(v),n)
def writejson(n,j): (D/n).write_text(json.dumps(j,ensure_ascii=False,indent=2,allow_nan=False))
def writecsv(n,rows):
 with (D/n).open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
points=[]
for i in range(L+1):
 q=zone(i);points.append({'s_m':i,'source_s_m':num(g['source_s'][i]),'longitude_deg':num(g['lon'][i],9),'latitude_deg':num(g['lat'][i],9),'map_east_m':num(xy[i,0]),'map_north_m':num(xy[i,1]),'game_east_m':num(gamexy[i,0]),'game_north_m':num(gamexy[i,1]),'dem_raw_m':num(zraw[i]),'elevation_m':num(z[i]),'height_from_timing_line_m':num(z[i]-z[0]),'elevation_council_calibrated_m':num(zcal[i]),'heading_deg':num(np.degrees(h[i])%360),'curvature_right_per_m':num(k[i],10),'radius_m':None if abs(k[i])<1e-6 else num(1/abs(k[i]),3),'gradient_percent':num(100*grad[i]),'gradient_council_calibrated_percent':num(100*grad[i]*cal_factor),'road_width_m':q[4],'banking_deg_estimate':0,'area':q[2],'environment':q[3],'geometry_quality':'mapped_smoothed_estimate','elevation_quality':'NSW_stereo_5m_sample_smoothed','width_quality':'estimate'})
writecsv('centreline_1m.csv',points)
segments=[]
for i in range(0,L,5):
 end=min(i+5,L);q=zone(i);segments.append({'id':len(segments),'s_start_m':i,'s_end_m':end,'length_m':end-i,'turn_radians':num(h[end]-h[i],10),'curvature_right_per_m':num((h[end]-h[i])/(end-i),10),'height_start_m':num(z[i]-z[0]),'height_end_m':num(z[end]-z[0]),'elevation_start_m':num(z[i]),'elevation_end_m':num(z[end]),'gradient_percent':num(100*(z[end]-z[i])/(end-i)),'east_start_m':num(gamexy[i,0]),'north_start_m':num(gamexy[i,1]),'east_end_m':num(gamexy[end,0]),'north_end_m':num(gamexy[end,1]),'road_width_m':q[4],'environment':q[3],'area':q[2],'rumble_colour':'red_white','surface':'asphalt','banking_deg_estimate':0})
writecsv('segments_5m.csv',segments)
# Extract turn groups objectively; neighbouring same-sign peaks may belong to multiple conventionally numbered corners.
ks=gaussian_filter1d(k[:-1],8,mode='wrap');mask=np.where(abs(ks)>.001,np.sign(ks),0);corners=[];a=0
for b in range(1,L+1):
 if b==L or mask[b]!=mask[a]:
  ang=float(np.sum(ks[a:b]));
  if mask[a] and abs(ang)>.04:
   apex=a+int(np.argmax(abs(ks[a:b])));raw_min=1/np.max(abs(k[a:b]));corners.append({'id':f'B{len(corners)+1:02d}','area':zone(apex)[2],'s_start_m':a,'s_apex_m':apex,'s_end_m':b,'length_m':b-a,'direction':'right' if ang>0 else 'left','turn_angle_deg':num(np.degrees(h[b]-h[a]),3),'thresholded_analysis_angle_deg':num(np.degrees(ang),3),'effective_radius_m':num((b-a)/abs(h[b]-h[a]),3),'min_local_radius_m':num(raw_min,3),'analysis_min_radius_m':num(1/max(abs(ks[a:b])),3),'elevation_apex_m':num(z[apex]),'elevation_change_m':num(z[b]-z[a]),'mean_gradient_percent':num(100*(z[b]-z[a])/(b-a)),'max_up_gradient_percent':num(100*max(grad[a:b])),'max_down_gradient_percent':num(100*min(grad[a:b])),'geometry_quality':'derived_estimate','boundary_quality':'algorithmic_threshold_not_surveyed','name_quality':'approximate_area_association','official_turn_number':None})
  a=b
writecsv('corners.csv',corners);writejson('corners.json',corners)
peaks,_=find_peaks(abs(ks),prominence=.002,distance=25)
peakrows=[{'id':f'P{j+1:02d}','s_m':int(i),'area':zone(int(i))[2],'direction':'right' if ks[i]>0 else 'left','analysis_radius_m':num(1/abs(ks[i]),3),'quality':'derived_estimate_not_official_turn_number'} for j,i in enumerate(peaks)]
writecsv('curvature_peaks.csv',peakrows)
straight_defs=[('Pit Straight',6010,6415,False),('Mountain Straight',296,1303,True),('Griffin to Cutting approach',1515,1710,True),('McPhillamy to Skyline run',2950,3130,True),('Conrod uninterrupted fast run',4035,5075,True),('The Chase approach after kink',5150,5335,True),('The Chase exit to Murray',5550,5900,True)]
straights=[]
for name,a,b,strict in straight_defs:
 inds=np.arange(a,b+1)%L;straights.append({'name':name,'s_start_m':a%L,'s_end_m':b%L,'wraps_lap':b>L,'length_m':b-a,'end_to_end_chord_m':num(np.linalg.norm(gamexy[b%L]-gamexy[a%L]),3),'max_abs_curvature_per_m':num(max(abs(k[inds])),8),'elevation_change_m':num(z[b%L]-z[a%L]),'mean_gradient_percent':num(100*(z[b%L]-z[a%L])/(b-a)),'boundary_quality':'estimated_tangent_zone','note':'Residual mapped curvature retained; this is a driving straight/run, not a mathematical line.'})
writecsv('straights.csv',straights);writejson('straights.json',straights)
# Landmarks: area and side grounded in organiser schematic; exact station, offset, dimensions are estimates.
landmark_defs=[('timing_line','Timing line (estimated)','road_line',0,0,12,0.1,'estimated location; distinct from standing-start line'),('grid_line','Standing-start line (illustrative)','road_line',90,0,12,.1,'estimated separation; no exact grid survey'),('pit_building','Pit garages','pit_building',6160,-30,250,14,'inside of Pit Straight'),('pit_paddock','Paddock','paddock',6120,-90,350,8,'organiser event schematic'),('grandstands','Pit Straight grandstands','grandstand',6160,35,230,14,'outside Pit Straight'),('museum','National Motor Racing Museum precinct','museum',5930,95,40,10,'organiser schematic; approximate location'),('mountain_farms','Mountain Straight rural buildings','farm',900,-55,25,7,'generic regional scenery; fictional instances'),('cutting_rock','The Cutting rock face','rock_face',1810,11,130,20,'area sourced; footprint estimated'),('reid_camp','Reid and Sulman camping','campground',2150,55,250,4,'organiser schematic; estimated extent'),('mcphillamy_camp','McPhillamy camping','campground',2810,65,300,4,'organiser schematic; estimated extent'),('skyline_view','Skyline Bathurst vista','vista',3140,100,1000,0,'scenic direction approximate'),('mountain_sign','Mount Panorama hillside lettering','hillside_sign',3180,-75,120,12,'organiser schematic places sign inside mountain descent'),('esses_walls','Mountain descent barriers','barrier_zone',3340,6,500,1.1,'estimated wall offset and height'),('elbow_wall','Forrest’s Elbow outside wall','barrier',3750,6,90,1.1,'estimated dimensions'),('conrod_crest','Conrod crest (DEM derived)','crest_marker',int(4300+find_peaks(z[4300:4800],prominence=1)[0][0]),0,0,0,'profile sample; see elevation extrema for actual crests'),('chase_gravel','The Chase gravel/runoff','gravel',5390,30,110,0,'organiser layout; estimated extent'),('hotel','Rydges Mount Panorama hotel','hotel',5510,80,100,22,'outside lower Conrod / Chase; schematic location'),('conrod_bridge','Lower Conrod pedestrian bridge','bridge',5660,0,22,7,'organiser schematic; estimated station and clearance'),('pit_bridge','Pit precinct pedestrian bridge','bridge',6060,0,22,7,'organiser schematic; estimated station and clearance'),('orchard_camp','Orchard and Chase camping','campground',4950,100,450,4,'organiser schematic; estimated extent')]
objects=[]
def place(ident,name,kind,station,offset,width,height,note,quality):
 i=int(station)%L;right=np.array([math.cos(h[i]),-math.sin(h[i])]);coord=xy[i]+right*offset;lon=meta['origin_lon']+coord[0]/(meta['N']*math.cos(meta['latitude_scale_radians']))*180/math.pi;lat=meta['origin_lat']+coord[1]/meta['M']*180/math.pi;zz=float(elev(lon,lat)[0]);zz=zz if math.isfinite(zz) else float(z[i]);gc=(coord-xy[0])*scale
 return {'id':ident,'name':name,'sprite_key':kind,'s_m':i,'offset_right_m':offset,'game_east_m':num(gc[0]),'game_north_m':num(gc[1]),'longitude_deg':num(lon,9),'latitude_deg':num(lat,9),'terrain_elevation_m':num(zz),'terrain_height_relative_m':num(zz-z[0]),'width_m_estimate':width,'height_m_estimate':height,'position_quality':quality,'dimensions_quality':'estimate','note':note,'collidable':kind in ['barrier','barrier_zone','rock_face']}
for d in landmark_defs:objects.append(place(*d,'schematic_estimate' if d[2]!='crest_marker' else 'DEM_derived_marker'))
landmarks=list(objects);rng=np.random.default_rng(6213)
for i in range(350,5850,18):
 q=zone(i)
 for side in [-1,1]:
  if q[3]=='walled_descent':kind='eucalyptus';off=side*float(rng.uniform(20,65))
  elif q[3]=='mountain_camp':kind='eucalyptus' if rng.random()<.65 else 'camp_tent';off=side*float(rng.uniform(18,100))
  else:kind='eucalyptus' if rng.random()<.8 else 'fence_post';off=side*float(rng.uniform(20,100))
  objects.append(place(f'scenery_{len(objects):04d}','Generated regional scenery',kind,i+int(rng.integers(-5,6)),num(off,2),6 if kind=='eucalyptus' else 3,14 if kind=='eucalyptus' else 2,'Deterministic illustrative scatter, not mapped individual objects','procedural_estimate'))
writecsv('landmarks.csv',landmarks);writecsv('scenery.csv',objects);writejson('scenery.json',{'landmarks':landmarks,'objects':objects,'scatter_seed':6213})
# DEM hills/valleys after smoothing; false DEM bumps still possible.
crests,_=find_peaks(z[:-1],prominence=1,distance=60);troughs,_=find_peaks(-z[:-1],prominence=1,distance=60)
extrema=[{'type':typ,'s_m':int(i),'elevation_m':num(z[i]),'area':zone(int(i))[2],'quality':'DEM_derived_not_surveyed'} for typ,arr in [('crest',crests),('trough',troughs)] for i in arr];writecsv('elevation_extrema.csv',extrema)
info={'schema_version':'1.0','name':'Mount Panorama / Wahluu','created_utc':'2026-10-09','lap_length_m':L,'race_direction':'anticlockwise','published_turn_count':23,'detected_bend_group_count':len(corners),'bend_groups_note':'Algorithmic same-direction groups; not one-to-one with 23 conventionally numbered corners. Full geometry retained.','units':'metres, radians, degrees as named','axes':{'game_east_m':'east from timing-line origin; uniformly scaled to 6213 m','game_north_m':'north from timing-line origin; uniformly scaled to 6213 m','heading':'clockwise from north','curvature':'positive=right, negative=left','offset_right_m':'positive right of racing direction'},'timing_line_quality':'estimated','geometry':meta,'elevation':{'default':'NSW DEM bilinear sampled, periodic Gaussian sigma 12m','raw_min_m':num(min(zraw)),'raw_max_m':num(max(zraw)),'smoothed_min_m':num(min(z)),'smoothed_max_m':num(max(z)),'smoothed_relief_m':num(max(z)-min(z)),'council_calibration':'optional affine scaling to minimum688 maximum862; inference from published highest862 and relief174','calibration_scale':num(cal_factor,10),'default_is_calibrated':False,'vertical_datum':'Service says orthometric metres; specific AHD realisation not confirmed in retrieved metadata'},'source_attribution':'NSW Spatial Services road and 5m stereo elevation services; Bathurst Regional Council facts; Supercars 2024 organiser schematic for landmark areas. All derived changes documented.','estimates':['timing line','corner boundaries','corner name-area association','road widths','banking (zero assumed)','scenery placement and dimensions','collision offsets','optional council-height calibration']}
writejson('metadata.json',info);writejson('track.json',{'metadata':info,'segments':segments,'corners':corners,'straights':straights,'scenery':objects,'environment_zones':[{'start_m':q[0],'end_m':min(q[1],L),'name':q[2],'environment':q[3],'road_width_m_estimate':q[4]} for q in zones]})
geo={'type':'FeatureCollection','features':[{'type':'Feature','properties':{'name':'NSW-derived smoothed centreline','quality':'mapped_smoothed_estimate','length_game_m':L},'geometry':{'type':'LineString','coordinates':[[num(g['lon'][i],9),num(g['lat'][i],9),num(z[i],3)] for i in range(0,L,5)]+[[num(g['lon'][-1],9),num(g['lat'][-1],9),num(z[-1],3)]]}}]};writejson('centreline.geojson',geo)
fig=plt.figure(figsize=(13,9),facecolor='#f8fafc');ax=fig.add_subplot(121);sc=ax.scatter(gamexy[:-1,0],gamexy[:-1,1],c=z[:-1]-min(z),s=4,cmap='terrain');ax.set_aspect('equal');ax.set_title('NSW-derived circuit • game lap 6,213 m');ax.set_xlabel('East (m)');ax.set_ylabel('North (m)');fig.colorbar(sc,ax=ax,label='Height above lowest point (m)',fraction=.04)
for c in corners: i=c['s_apex_m'];ax.annotate(c['id'],gamexy[i],fontsize=7,xytext=(5,3),textcoords='offset points')
ax=fig.add_subplot(222);ax.plot(s,z,color='#087e8b');ax.set_title('Elevation profile • retrieved heights');ax.set_ylabel('Orthometric elevation (m)');ax.grid(alpha=.2)
ax=fig.add_subplot(224);ax.plot(s,grad*100,color='#b45309');ax.axhline(0,c='gray',lw=.6);ax.set_ylabel('Gradient (%)');ax.set_xlabel('Game chainage (m)');ax.grid(alpha=.2);fig.tight_layout();fig.savefig(P/'circuit_overview.png',dpi=160);plt.close(fig)
checks={'segment_count':len(segments),'point_count':len(points),'segment_length_sum_m':sum(r['length_m'] for r in segments),'last_segment_length_m':segments[-1]['length_m'],'mapped_closure_error_m':num(np.linalg.norm(xy[-1]-xy[0]),9),'height_closure_error_m':num(z[-1]-z[0],9),'total_heading_change_deg':num(np.degrees(h[-1]-h[0]),6),'curvature_integral_deg':num(np.degrees(np.trapezoid(k,s)),6),'dem_missing_samples':int(np.sum(~np.isfinite(zraw))),'max_gradient_percent':num(100*max(grad)),'min_gradient_percent':num(100*min(grad)),'min_radius_m':num(1/max(abs(k)),3),'all_game_values_finite':True,'source_feature_planimetricaccuracy_values':sorted(set(f['attributes']['planimetricaccuracy'] for f in json.load(open(P/'raw/circuit_roads.json'))['features']))}
assert checks['segment_length_sum_m']==6213 and checks['mapped_closure_error_m']<.000001 and abs(checks['total_heading_change_deg']+360)<.001
writejson('validation.json',checks);print(json.dumps({'metadata':info,'checks':checks,'corners':len(corners),'objects':len(objects)},indent=2))
