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

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Then visit the URL shown in the terminal (typically `http://localhost:5173`).

To build for production:

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Data note
Venue details are seeded from publicly available listings and should be rechecked with each venue before publication. Rates, hours, availability, and amenities can change quickly.

## Roadmap
- Real distance sorting with browser geolocation
- Venue detail pages with photos and booking/social links
- Open-play calendar and player-level filters
- Admin venue submission/editing
- Nationwide province/city coverage
- Community verification and reporting
