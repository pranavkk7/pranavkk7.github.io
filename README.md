# pranavkk7.github.io

My portfolio: [pranavkk7.github.io](https://pranavkk7.github.io)

Every project on the page has a live demo, and the main one, the Unique Fitness Gym front-desk app,
can be run right inside the page.

## How it's built
- Vite with plain HTML, CSS and JavaScript. No framework, so the page stays small and fast.
- GSAP (ScrollTrigger, SplitText) for the motion, Lenis for smooth scrolling with a mouse or trackpad.
- One choreographed opening (the headline rises line by line, the phone settles into place), then
  motion that follows the reader: the gym app's phone stays pinned while its story scrolls past and
  swaps screens chapter by chapter.
- Archivo, one variable font: expanded for display, normal width for reading. The colours are the
  gym app's "Plate & Chalk" design, so the portfolio and the main project share one identity.
- The live gym app loads only when someone presses "Run the live app"; the PolySub sample plays with
  sound only when asked.
- Motion respects `prefers-reduced-motion`: with it on, everything appears in place.

## Run locally
```bash
npm install
npm run dev
```

## Deploy
Every push to `main` builds the site and publishes it to GitHub Pages (Settings > Pages > Source:
GitHub Actions).
