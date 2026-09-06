# sophia-funny-dragon
Sophie's funny dragon game made with Astra

**[Play Gem Meadow](https://amyleesterling.github.io/sophia-funny-dragon/)**

Play as Sophia! Collect 20 gems per level while dodging four silly dragons. Each new level makes the dragons roam farther and faster. On a phone, use the left joystick and the DASH button. On a computer, use WASD or arrow keys, Space to dash, and Escape to pause. Click the ground to walk there.

The first playable prototype includes the four supplied textured GLB dragons, visible fire warnings, three hearts, gem collecting, a win screen, replay, optional sound, and pause when the tab loses focus. Sophia uses her supplied rigged running animation. Dragon movement uses whole-model roaming, turns and bobs; the dragons do not yet have articulated rigs. Flames use simulated particles with velocity, drag, turbulence, buoyancy and additive glow. The mouth-origin warning shows the shared particle/damage envelope and remains visible until the flame particles expire.

Collect gems while a cast of wonderfully silly dragons tries to breathe fire on you.

## Project starters

- [Game notes and dragon roster](docs/GAME_NOTES.md)
- [Character reference gallery](assets/references/README.md)
- [Reference generation prompts](docs/ART_PROMPTS.md)

Current stage: playable mobile-browser prototype, plus the original ten-image reference gallery. The two unnamed model uploads use the working names Sir Snortstache and Flapjack. The clown dragon replaces Sunny and uses the working name Professor Wiggles; Snugglehorn retains its uploaded name.

## Development

This is a buildless static game. Serve the repository with any static HTTP server (for example, `python3 -m http.server 8000`) and open it in a modern WebGL 2 browser. Opening the HTML as a local `file://` URL is not supported. No API keys or third-party runtime CDN requests are needed.

- `npm test` checks fire collisions, dodging, arena boundaries, and gem reachability.
- `npm run check` checks JavaScript syntax.
- `python3 tools/prepare_models.py /path/to/originals` recreates the smaller game models with Pillow.
- [Model provenance and runtime notes](docs/PROTOTYPE.md)

GitHub Pages deploys the repository root from `main`. Three.js 0.180.0 and its loader are vendored with their MIT license.
