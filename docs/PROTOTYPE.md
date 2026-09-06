# Gem Meadow prototype

Live: https://amyleesterling.github.io/sophia-funny-dragon/

## Supplied characters

| Runtime file | Display name | Original upload |
| --- | --- | --- |
| dragon-one.glb | Sir Snortstache (working name) | Meshy_AI__0905161735_texture.glb |
| dragon-two.glb | Flapjack (working name) | Meshy_AI__0905161811_texture.glb |
| sunny.glb | Sunny | Meshy_AI_Sunny_the_Dragon_0905161754_texture.glb |
| snugglehorn.glb | Snugglehorn | Meshy_AI_Snugglehorn_the_Purpl_0905161824_texture.glb |

All four are used in the game. These are derivatives of the user-supplied models, not newly generated Meshy API results. Geometry and UVs are unchanged. Base color textures are resized to at most 1024 pixels; roughness/metallic and normal textures to 512 pixels, stored as JPEG within the GLBs. The game bundle is approximately 2.3 MB for all four models. Original uploads remain unmodified. Exact sizes and source filenames are in `assets/models/manifest.json`.

## Playable behavior

- Collect all 20 gems to win. Gems stay collected after a hit.
- Three hearts; a hit provides a short grace period to escape.
- Touch joystick, arrow keys/WASD, or ground click/tap to move.
- Dash with the button or Space; dash provides brief fire immunity, followed by a cooldown.
- Dragons warn for 1.35 seconds and lock their fire direction before breathing for 1.05 seconds. Up to two dragons can attack at once.
- Fire collision is calculated in the same world direction as its ground warning. Walk or dash sideways, or leave its range.
- Camera follows the player, more closely on narrow phone screens.
- Pause/resume and full replay. Switching tabs automatically pauses.
- Model loading progress and a retry state if any model fails. Play unlocks only once all four arrive.

## Implementation and limits

The supplied models have no skeletons, skin weights, or animation clips. Whole-model procedural bobbing, turning, and inflation provide prototype motion; do not describe this as rigged walking or animated jaws. Fire and gem effects are separate game objects. The explorer is a simple procedural placeholder, not a likeness of Sophia.

This is static HTML/CSS/JavaScript with vendored Three.js 0.180.0. It needs WebGL 2 and has no backend, accounts, analytics, API keys, or external runtime dependencies. UI fonts are system fonts. Device pixel ratio is capped to reduce mobile GPU work. Models are loaded once, and instanced effects reuse geometry.

Validation includes JavaScript syntax, local module/asset resolution, GLB buffer and geometry checks, and deterministic gameplay tests. An actual-device playtest is still needed to tune control feel, visibility, and frame rate on Sophia's phone/tablet. Rigged character animation and further texture/mesh refinement are next production steps.

## Update: Sophia, levels, and simulated fire

- Sophia now uses the supplied running GLB with its skeleton and clip intact. Horizontal Hips translation is neutralized on a cloned runtime clip so game movement owns her world position. Running pauses in a selected frame while stopped; an idle clip has not been supplied. Dash currently retimes the same running clip. Separate FAST, gem-celebration jump, and level-complete dance slots are reserved but not fabricated.
- The explorer description above is superseded by Sophia's supplied character.
- Winning opens the next level. Dragon waypoint radius and speed increase per level, capped at 7 units and 2.2 units/second. Dragons avoid one another and the player while roaming and stand still while aiming/firing/cooling.
- Flames now use persistent particles integrated in steps no longer than 1/90 second with jet divergence, lateral turbulence, drag, and upward buoyancy. Additive shader sprites and flickering point lights provide glow. This is a lightweight game simulation, not a computational fluid-dynamics solver.
- A frozen mouth-origin attack object drives the warning polygon, particle envelope, and hit gate. Damage requires a nearby particle at character height plus being inside the warned footprint. Outside the warning is safe; the envelope is conservative rather than every point being damaging simultaneously. It stays visible through particle expiry.
- Validation: real GLB parsing and animation binding, movement, dash immunity, pause/resume, level advancement, aim locking, particle containment/expiry, warning-boundary tests, and existing gem/win/loss tests. Visual control feel still benefits from an actual device playtest.
