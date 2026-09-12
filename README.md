# PicklePH — Pickleball Courts Finder

A Cebu-first pickleball court directory and filter for the Philippines.

## MVP features
- Search by venue, city, barangay, or address
- Cebu-first region filter with Philippines expansion
- Cebu area chips: Cebu City, Mandaue, Lapu-Lapu, Talisay, Consolacion
- Price filters
- Indoor/outdoor, aircon, night lights, parking, paddle rental, open play, and café filters
- Sort by recommended, price, number of courts, distance, or name
- Google Maps links and Leaflet map view
- Dark/light mode
- Responsive mobile layout
- Venue data stored as plain JSON for safer, simpler maintenance

## Run locally

This is a zero-build static site. Serve the folder with any static server.

```bash
python -m http.server 3000
```

Then visit `http://localhost:3000`.

## Data structure

The primary venue database lives in `data/venues.json` with two top-level properties:

- `venues` — the core venue records
- `detailOverrides` — extra phone, booking, social, source, and verification fields merged into matching venues

Additional discovery feeds under `data/` are loaded as normal JSON arrays and merged by venue name.

The browser never downloads JavaScript and extracts data with regex or `eval`/`new Function`. This keeps the data layer independent from executable code and avoids silent total data loss when JavaScript formatting changes.

## Map coordinates

Map pins and distance calculations use a venue's explicit `lat` and `lng` only. The app no longer substitutes a city/area center as if it were the real venue location. Venues without exact coordinates remain searchable but are intentionally omitted from the map until coordinates are added.

## Community contributions

“Add a Court”, reviews, and reports are currently local-device features. They are not transmitted to the site owner or automatically published. The UI makes that limitation explicit rather than implying that a remote moderation queue exists.

## Data note
Venue details are seeded from publicly available listings and should be rechecked with each venue before publication. Rates, hours, availability, coordinates, and amenities can change quickly.

## Roadmap
- Add verified latitude/longitude to every venue
- Real community submission endpoint and moderation workflow
- Open-play calendar and player-level filters
- Admin venue submission/editing
- Nationwide province/city coverage
- Community verification and reporting
