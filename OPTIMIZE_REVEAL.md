# Local optimize: reveal animation

Edit the existing Vite + TypeScript + three.js project in this directory. Do not rewrite from scratch.

## Goal
Add a polished entrance animation:

1. **Bottom-to-top gradient reveal** of the whole diorama: scene appears as if a soft vertical mask/clip rises from the square base upward (like fog clearing from ground to sky). Prefer a shader/clipping/opacity-by-height approach that feels smooth and anime-like. No UI overlays for this.

2. **Staggered object appear**: props and store parts fade/scale/rise into place one after another (not all at once). Order roughly: base/road first → store building → signs/awning → street props (vending, bike, umbrellas, trash, lights, poles, etc.). Soft easing; keep the toon/anime look.

3. Camera can have a very subtle settle-in (optional), still orbit-controllable after/during reveal. No visible UI/HUD.

## Constraints
- Keep no-UI rule.
- Keep architecture (src/scene, src/objects, materials).
- Prefer a dedicated module e.g. `src/scene/reveal.ts` wired from `createScene.ts` / main loop.
- Update `docs/SCENE_SPEC.md` briefly about the reveal.
- Run `npm run build` and fix until it passes.
- Do not ask questions; implement now.