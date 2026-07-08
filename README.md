# ArcCentrx Website (v2 — upgraded static build)

A responsive, interactive static rebuild of the ArcCentrx site, upgraded from the
v1 mockups in `../ArcCentrx-Freelancer-Handoff/02-Designs/`.

**Copy source:** all page copy is transcribed verbatim from the live Wix site
(https://thomasyoung93.wixsite.com/arccentrx) as of 2026-07-08 — that's the source of
truth. Top nav matches the live site: Home / Services (Assess·Align·Accelerate) / About /
Get in touch. One deliberate correction: the live Accelerate page's "Where We Focus"
subline reads "Five areas of diagnostic work" (it has three execution areas) — rendered
here as "Three areas of execution work." Worth fixing on the live site too.

## Run it locally
Any static server works, e.g. from this folder:
```
python3 -m http.server 4599
```
Then open http://localhost:4599/index.html

## Pages
| File | Page |
|---|---|
| `index.html` | Home |
| `services.html` | Services overview |
| `assess.html` / `align.html` / `accelerate.html` | Pillar pages |
| `about.html` | About + founding team |
| `blog.html` | Insights (placeholder posts) |
| `contact.html` | Contact form + info |

## How it's built
- **`assets/styles.css`** — all styling. Brand palette lives in `:root` CSS variables
  (navy `#1B2A4A`, teal `#1D9E75`, etc.). Fluid type via `clamp()`. Two breakpoints
  (900px = mobile nav, 820px = stacked grids).
- **`assets/site.js`** — injects the shared header + footer into every page (so nav
  stays consistent in one place), and wires the mobile hamburger menu, the Services
  dropdown, sticky-header shadow, scroll-reveal animations, and the contact form.
  Each page sets `<body data-page="...">` so the right nav item highlights.

## What's new vs. v1
- **Typography:** Inter (Google Fonts), larger base size, better line-height.
- **Interaction:** sticky glass header, hover lifts on cards, scroll-reveal, animated
  hamburger + expandable mobile menu, Services dropdown, focus states.
- **Responsive:** everything stacks cleanly on tablet/phone.
- **Home rows to expand later** (clearly commented in `index.html`): a proof/stats
  band, a "How we work" 3-step process, and a feature (image+text) row.

## Open items (placeholders to fill)
- **Contact info** — matches the live site's current placeholders: `hello@arccentrx.com`,
  `+1 (512) 555-0123`, "123 Business Avenue, Suite 400, United States". Replace with real details.
- **Home expandable rows** — two clearly-commented `<!-- EXPANDABLE ROW -->` blocks in
  `index.html` (a "How we work" 3-step strip built from Assess/Align/Accelerate, and a
  placeholder feature row). Fill or delete as you like — they don't affect the rest.
- **Blog** — four placeholder posts in `blog.html` (linked from the footer, not the top nav,
  matching the live site); wire to a real CMS/blog when ready.
- **Fonts** — loaded from Google Fonts CDN. To fully self-host, use the TTFs in
  `../Branding Guidelines/Inter.zip` with `@font-face`.
- **Images** — visual placeholders (dashed/gradient boxes) mark where real photography goes.
