# Mount Panorama digital circuit reconstruction — accuracy report

Prepared 10 October 2026 (Australia/Sydney). This is a complete, independently calculated GIS-based approximation for an old-school pseudo-3D game. It is not a circuit survey, a laser scan, a licensed simulator mesh, or a measured racing line.

## Delivered result

The lap is exactly **6,213 game metres**, anticlockwise, including The Chase. The files contain **6,214 centreline samples** (including the repeated endpoint), **1,243 road segments** (1,242 × 5 m plus a final 3 m), **22 calculated bend groups**, named driving straights, **20 landmark records**, and **632 total scenery records**. All sections of the lap are represented continuously, regardless of bend grouping.

The published count is 23 turns. The bend catalogue is an objective same-direction curvature segmentation, not an assertion that Mount Panorama has 22 official corners. It combines close same-direction bends and also detects a small bend on the nominal Conrod road. The Cutting and Reid-area groups contain multiple curvature peaks. Official numbered boundaries cannot be recovered reliably from the road data; `official_turn_number` is intentionally null. `curvature_peaks.csv` provides finer local curvature extrema without inventing surveyed turn numbers.

## Retrieved inputs and provenance

* **NSW Transport RoadSegment**, FeatureServer layer 5: 27 features, 177 connected coordinates including closure. Selected by road names, then endpoint-walked in race direction. Every feature has `planimetricaccuracy=10`; a confidence level/unit definition was not obtained from the layer response. This should be treated as approximately 10 m mapping-class information, not a verified ±10 m ground-truth bound. Features were retrieved now, but feature reliability dates are April–August 2013; feature modifications range from November 2013 to June 2022. Fresh retrieval does not make old mapped geometry a 2026 survey.
* **NSW_5M_Elevation**: successfully downloaded a 691 × 641 float32 GeoTIFF covering the entire circuit. Service metadata describes 5 m post spacing, stereo-imagery-derived elevation and orthometric metres, with service copyright DFSI 2019. Export pixel spacing is approximately 4.995 m in EPSG:3857 (approximately 4.17 m on the ground at this latitude). This export resampling does not improve the source accuracy. Specific acquisition date and vertical RMSE for this tile were not established. This is **not claimed as 1 m LiDAR**.
* **Bathurst Regional Council**: lap length, anticlockwise direction, 23 turns, highest point 862 m, relief 174 m, grade 1:6.13, named straight lengths and corner-area descriptions.
* **Supercars organiser 2024 event map**: inspected to ground landmark precinct and side associations. It is explicitly schematic/not to scale. The 2026 organiser outline was used as a topology cross-check, not as metric geometry.

Full endpoints, parameters, raw responses, raster, feature IDs and metadata are retained. The unsuccessful OpenStreetMap request was not used. No existing commercial game geometry was used. External maps included as research references are not game textures or sprite assets.

## Distance, coordinate systems and closure

| Quantity | Value |
|---|---:|
| Raw mapped horizontal polyline | 6197.734 m |
| Difference from 6,213 m | 15.266 m (0.246%) |
| After 12 m horizontal smoothing | 6163.951 m |
| Game coordinate/chainage factor | 1.007957360 |
| Smoothed-to-source maximum nearest displacement | 4.271 m |
| Smoothed-to-source 95th-percentile displacement | 1.298 m |
| Game distance sum | 6,213.000 m |
| Position/height closure | 0.000 m / 0.000 m |
| Total heading change | −360.000° |

Returned road coordinates are EPSG:4326. A WGS84 ellipsoidal local tangent approximation uses meridional and prime-vertical radii at latitude −33.448°. It avoids using Web Mercator metres as ground lengths. Over this small area, projection approximation is much smaller than source mapping uncertainty; a formal geodetic error bound was not established. The road service's datum transformation details were not audited, so metre-scale registration uncertainty remains possible.

The polyline is densified near 1 m and periodically Gaussian-smoothed with sigma 12 m; a periodic cubic spline then supports arc-length resampling. The spline interpolation of the already dense curve is numerical support, not new measured detail. Geographic/map coordinates remain at their retrieved geographic scale. `game_east_m` and `game_north_m` are uniformly scaled about the timing origin by the factor above so the game length and curvature units agree. This is a **length calibration**, not proof of positional accuracy. Both map and game coordinates are provided.

Zero chainage is an **estimated timing-line point** at -33.439282261, 149.558360004. The start/grid and finish lines are distinct in reality; the supplied grid marker and its separation are illustrative estimates. Moving the timing origin later only rotates stationing and does not change track shape.

## Elevation and gradient

| Quantity | Retrieved/derived | Published reference |
|---|---:|---:|
| Raw sampled minimum | 699.837 m | Not directly supplied |
| Raw sampled maximum | 874.134 m | 862 m highest |
| Smoothed minimum | 699.919 m | 688 m inferred from 862−174 |
| Smoothed maximum | 874.006 m | 862 m |
| Smoothed relief | 174.088 m | 174 m |
| Maximum derived uphill grade | 13.838% | 16.313% (1 in 6.13) steepest grade |
| Maximum derived downhill grade | -17.644% | No separate downhill figure verified |

There is roughly a **12 m absolute-height discrepancy**, while relief agrees closely. The cause is unverified; it could involve reference conventions, source surface/model error or the published value. Do not treat it as a demonstrated datum correction. Default game heights preserve the retrieved DEM shape and use relative height from the timing line.

An optional column `elevation_council_calibrated_m` applies `688 + (z−min(z)) × 174/(max(z)−min(z))`. It makes the minimum/maximum exactly 688/862 m, **an explicitly labelled inferred calibration**, not new measurements. Default `elevation_m` is not silently changed. The raster service says orthometric, but the exact AHD realisation was not confirmed. Never claim centimetre precision because values have decimal digits.

Elevation is bilinearly sampled from the raster at the smoothed mapped coordinates; all 6,214 samples have data. A periodic Gaussian sigma 12 m reduces high-frequency noise. Gradient is a central difference of smoothed elevation with respect to **game horizontal chainage**, expressed as 100 × dz/ds. It is not a 3D road-surface-length gradient. Segment gradients are endpoint differences. The observed grade disagreement is retained, not forced to match the published maximum. DEM errors and centreline offsets can produce artificial local slope changes, especially beside walls and rock cuttings. Small crests and dips are estimates; the Dipper's exact road cross-section is unresolved.

## Curvature, radii and angles

Heading is clockwise from north. Curvature is positive right / negative left. For local east/north curve derivatives, geometric left curvature is `(x′y″−y′x″)/(x′²+y′²)^(3/2)`; the delivered game curvature reverses sign and divides by the game-length scale. Local radius is `1/abs(curvature)`. Near-straight radii become null when abs(curvature)<1e−6; CSV represents null as an empty field.

The bend-analysis curve is additionally Gaussian-smoothed by sigma 8 game metres. A group is a same-sign run above abs(curvature)=0.001 m⁻¹ and at least 0.04 rad of accumulated analysis angle. Adjacent bends need not have a surveyed tangent between them. Group turn angle uses the underlying geometric heading difference. `effective_radius_m=group_length/abs(heading_change)` describes an equivalent constant-radius arc; `min_local_radius_m` is the tightest reconstructed local radius and is highly sensitive to smoothing and sparse vertices. `analysis_min_radius_m` is the radius of the filtered analysis curve. These columns intentionally have different meanings.

**Use continuous segment turns for rendering. Do not replace complex corners with the table's equivalent circular arc.** Source capture, 10-class horizontal accuracy, arbitrary analysis boundaries and smoothing prevent a reliable survey-level radius uncertainty. Decimal precision in the files is computational precision only.

| Bend ID | Approximate area | Chainage (m) | Direction | Turn angle (°) | Effective radius (m) | Min local radius (m) |
|---|---|---:|---|---:|---:|---:|
|B01|Hell Corner|203–295|left|-88.8|59.4|17.5|
|B02|Griffin’s Bend|1304–1512|right|109.3|109.1|58.1|
|B03|The Cutting|1713–1935|left|-158.6|80.2|28.9|
|B04|Reid Park|1958–2253|right|105.8|159.7|69.6|
|B05|Reid Park|2262–2331|left|-21.3|185.4|93.5|
|B06|Sulman Park|2363–2400|left|-4.8|445.7|311.7|
|B07|Sulman Park|2419–2484|left|-17.2|215.9|117.8|
|B08|Sulman Park|2497–2648|left|-52.0|166.3|100.3|
|B09|McPhillamy Park|2794–2943|left|-56.7|150.6|85.3|
|B10|Brock’s Skyline|3150–3215|right|28.6|130.1|83.8|
|B11|The Esses / Dipper|3220–3285|left|-36.5|102.1|58.2|
|B12|The Esses / Dipper|3288–3370|right|66.0|71.2|46.5|
|B13|The Esses / Dipper|3371–3420|left|-56.4|49.8|28.2|
|B14|The Esses / Dipper|3422–3488|right|39.8|95.0|51.6|
|B15|Forrest’s Elbow approach and exit|3526–3588|left|-21.1|168.1|88.7|
|B16|Forrest’s Elbow approach and exit|3597–3693|right|42.1|130.7|67.0|
|B17|Forrest’s Elbow approach and exit|3701–3823|left|-122.0|57.3|30.0|
|B18|Conrod Straight|3946–4028|left|-20.7|226.8|119.5|
|B19|The Chase|5079–5145|right|14.9|253.2|142.6|
|B20|The Chase|5341–5427|left|-66.3|74.3|33.3|
|B21|The Chase|5433–5542|right|49.0|127.4|76.0|
|B22|Murray’s Corner|5908–6004|left|-90.6|60.7|24.2|

### Smoothing sensitivity

The following variations use the same retrieved road vertices, independently rebuilt and each length-calibrated to 6,213 m. They are **model sensitivity**, not confidence intervals or alternative measured circuits.

| Horizontal sigma (m) | Hell minimum radius (m) | Cutting minimum (m) | Dipper-area minimum (m) | Murray minimum (m) |
|---:|---:|---:|---:|---:|
|8|13.8|27.1|24.6|22.0|
|12|17.5|28.9|28.2|24.2|
|16|21.3|29.5|34.7|26.6|

The tight Hell Corner radius is particularly sensitive to the sharply simplified source vertex. It must be treated as a low-confidence estimate. The full map is geographically grounded; local radii and short tangent positions are less certain than overall shape.

## Straight lengths and naming

`straights.csv` reports estimated tangent-zone/driving-run lengths, endpoint chord lengths and residual curvature. A nominal straight can retain real or mapping-derived curvature. Pit Straight wraps chainage zero. Council gives Mountain Straight 1,111 m and Conrod Straight 1,916 m; those named road-section definitions are **not necessarily the same as strict uncurved tangent lengths**. The Chase interrupts Conrod. Therefore this package does not stretch individual tangent runs to those figures or hide The Chase to claim a 1,916 m mathematical straight. Exact official section endpoints were unavailable. The complete continuous road remains the authoritative game input.

## Scenery, width, banking and collisions

Twenty landmark records cover pit buildings/paddock/grandstands, the museum precinct, cutting rock, Reid/Sulman and McPhillamy camps, skyline vista, hillside lettering, descent walls, Forrest's Elbow, Conrod crest, Chase runoff, hotel, bridges and camping precincts. Area/side associations come from the organiser schematic and council descriptions. **Every exact station, offset, footprint, size and clearance is estimated**, except that the selected Conrod crest station is derived from the DEM profile. Scenery heights sample the same raster but are not building-roof heights.

An additional deterministic scatter supplies regional trees, tents and fence posts. These are illustrative instances, not individually mapped vegetation. Sprite keys are symbolic asset references; no art assets are claimed included. Side is relative to race direction: positive offset is right. Road widths (8.5–12 m), barrier setbacks/heights, lane appearance and collision recommendations are estimates. Banking defaults to zero as an unresolved assumption; this does not assert the real road has no banking. Griffin's negative camber is described by council, but no numerical angle was obtained. Bridges and branded structures must not be treated as clearance surveys.

## Validation and practical limits

* Exact 6,213 m segment sum, final 3 m segment, finite numerical output, anticlockwise −360° heading, closed position and elevation, continuous endpoint references, full raster coverage and parseable strict JSON/CSV were checked.
* Integrated sampled curvature gives -359.987571°, a small discretisation difference from exact endpoint heading. Summing segment `turn_radians` gives exactly −2π to floating-point tolerance.
* Verified math/closure is not independent validation against a circuit survey. No vehicle racing line, barriers, kerbs, building footprints, track camber or road micro-topography were surveyed.
* Best-supported features: overall topology, geographic route, broad terrain profile and lap order. Lower-confidence features: local radii, gradients over short distances, timing-line location, named corner boundaries and scenery coordinates.
* No user measurement, download or processing is needed to use the package. Rebuild code is provided for transparency, not as a task the user must perform.

## Sources and attribution

NSW Spatial Services road and elevation data were retrieved and transformed, smoothed and length-calibrated as described. The Data.NSW road listing identifies a Creative Commons Attribution licence; preserve source attribution. The elevation endpoint provides copyright text but no full licence terms in the returned metadata. A universal redistribution licence for the entire package is therefore not invented. Reference organiser maps/images remain their owners' material and are included for documentation, not as game art. A public game should use its own textures and sprites; this package supplies data and placeholder keys.

* [NSW_ROADS](https://portal.spatial.nsw.gov.au/server/rest/services/NSW_Transport_Theme/FeatureServer/5) — horizontal road centreline
* [NSW_DEM](https://maps.six.nsw.gov.au/arcgis/rest/services/public/NSW_5M_Elevation/ImageServer) — elevation profile and scenery terrain
* [COUNCIL_FACTS](https://www.bathurst.nsw.gov.au/Services/Facilities/Mount-Panorama/About-the-Mount/Track-Facts) — 6213m,23 turns,862m highest,174m relief,1in6.13 steepest grade, named straight figures
* [COUNCIL_AREAS](https://www.bathurst.nsw.gov.au/Services/Facilities/Mount-Panorama/About-the-Mount/The-Circuit) — named area ordering, landscape descriptions
* [SC2024](https://assets.ctfassets.net/xd502h20t7lh/y5OOOnBAu9a0rhfbpFFDi/814ef60c675474b00ecf467e0cf21e29/BATHURST24_TrackMap.pdf) — landmark side and precinct association only; schematic says not to scale
* [SC2026](https://www.supercars.com/circuit/mount-panorama-motor-racing-circuit) — qualitative topology cross-check using organiser image
