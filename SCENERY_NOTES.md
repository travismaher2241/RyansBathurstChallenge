# Mount Panorama scenery layer

This is an artistic, race-weekend interpretation of the circuit surroundings,
not a surveyed reconstruction of individual trees or buildings.

The road data, road renderer, barriers, physics, AI, camera and lap timing are
unchanged. `sceneryDetail.ts` generates deterministic, non-collidable decorations
in a render-only collection. It rejects placements whose billboard footprint
comes within five metres of any road edge, including neighbouring track sections.
It replaces selected old visual placeholders without mutating track scenery.

## Appearance

- Eight gum silhouettes, clustered around clearings, with open rural straights.
- Vineyard rows near Griffin's Bend and orchard rows along Conrod.
- Rock banks at The Cutting and ground backing beneath uphill scenery.
- Caravans, dome tents, parked utes and spectators across the mountain parks.
- Modular pit, grandstand, paddock and hotel structures.
- A heading-anchored distant valley with fields and a town silhouette that
  gradually becomes visible as the car climbs.

Artwork is cached Canvas 2D, matching the existing rendering architecture.
Scenery uses a sorted visibility index, horizontal culling and existing road
crest clipping. `SceneryRenderer.showRaceWeekend` separates temporary decorations
from permanent scenery; it defaults to true without adding a new settings menu.
Ground follows the existing road elevation at each anchor. Historical scenery
terrain-height estimates are deliberately not applied: accurate off-road terrain
would need a continuous terrain surface, not isolated height changes that float
objects above the current ground.

## References

- [Bathurst Regional Council circuit guide](https://www.bathurst.nsw.gov.au/Services/Facilities/Mount-Panorama/About-the-Mount/The-Circuit)
- [2026 Bathurst 12 Hour indicative venue map](https://images.ctfassets.net/jxsy204u8e5z/43dfMJ2vjVe1eVBeDNZyq1/bfa069bb5f82efdf8abfca839c8fa06b/SC26-12HR-Event_Track_Map-3.pdf)
- [Mark Walker's 2019 photographic guide](https://www.theracetorque.com/2019/10/gallery-tbt-mount-panorama-bathurst/)

The map informs broad venue relationships. The photos inform rural character;
they are not used as a source for current sponsor signage. Generated placements,
tree species silhouettes, town buildings and dimensions remain estimates.

## Checks

`npx tsc --noEmit`, `npm run build`, `node test_suite.cjs`, and
`node scripts/test-scenery.cjs`.
