# Mount Panorama scenery layer

This is an artistic, race-weekend interpretation of the circuit surroundings,
not a surveyed reconstruction of individual trees or buildings.

The track centreline, road widths and elevation data are unchanged.
`sceneryDetail.ts` generates deterministic, non-collidable decorations in a
render-only collection. Ground scenery keeps five metres of road clearance
(hillside signs use 1.5 metres). Overhead bridges instead have separate support
and beam-clearance checks. Original bridge placeholders are replaced, not doubled.
The Cutting's continuous wall shares its position with collision code through
`trackBoundaries.ts`, with clearance for the player's car body.

## Appearance

- Eight gum silhouettes, clustered around clearings, with open rural straights.
- Vineyard rows near Griffin's Bend and orchard rows along Conrod.
- A continuous wall at The Cutting and ground backing beneath uphill scenery.
- Caravans, dome tents, parked utes and spectators across the mountain parks.
- Modular pit, grandstand, paddock and hotel structures.
- A heading-anchored distant valley with fields and a town silhouette that
  gradually becomes visible as the car climbs.

Artwork is cached Canvas 2D, matching the existing rendering architecture.
Scenery uses a sorted visibility index, horizontal culling and existing road
crest clipping. Nearer wall faces also mask scenery and opponents behind them.
`SceneryRenderer.showRaceWeekend` separates temporary decorations
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

`npx tsc --noEmit`, `npm run build`, and `npm test`.

The test command covers geometry, the actual gameplay modules (gear limits,
reset eligibility, difficulty-specific records, wall contact, sector selection
and a three-lap Arcade simulation), and scenery placement/occlusion. Tests run
against in-memory storage and do not change browser records.
