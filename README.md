# PicklePH — Pickleball Courts Finder

A Cebu-first pickleball court directory and filter for the Philippines.

## MVP features
- Search by venue, city, barangay, or address
- Cebu-first region filter with Philippines expansion
- Cebu area chips: Cebu City, Mandaue, Lapu-Lapu, Talisay, Consolacion
- Price filters
- Indoor/outdoor, aircon, night lights, parking, paddle rental, open play, and café filters
- Sort by recommended, price, number of courts, or name
- Google Maps links
- Dark/light mode
- Responsive mobile layout
- Venue data kept in one JavaScript file for simple maintenance

## Run locally

This is a zero-build static site. Open `index.html` directly, or serve the folder with any static server.

```bash
python -m http.server 3000
```

Then visit `http://localhost:3000`.

## Data note
Venue details are seeded from publicly available listings and should be rechecked with each venue before publication. Rates, hours, availability, and amenities can change quickly.

## Roadmap
- Real distance sorting with browser geolocation
- Venue detail pages with photos and booking/social links
- Open-play calendar and player-level filters
- Admin venue submission/editing
- Nationwide province/city coverage
- Community verification and reporting
