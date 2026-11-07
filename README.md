# Chai Travel Advisors · Airline Directory

Static front-end for the Air Database (Supabase). No build step: `index.html`, `app.js`, `styles.css`, `chai-logo.png`.

- Hosting: GitHub Pages from `main` (root). Any static host works.
- Auth: Supabase (Google + Microsoft sign-in). Access is decided by the `allowlist` table in the database; row-level security enforces viewer/editor/admin.
- Data source: First in Service airline pages, US point of sale, captured Nov 2026. Not verified by Chai.
