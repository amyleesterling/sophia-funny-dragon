# Sophia's Funny Dragon — starter notes

## Sophia's game idea

You play a character collecting gems while silly dragons try to breathe fire on you. The intended platform is mobile. The dragons should be funny and appealing, with ten individual reference images to establish the style and potentially guide 3D asset generation.

Sophia specifically requested a dragon with a mustache, one wearing a rainbow clown wig, one that is really fat, another that is fat with tiny legs, and one covered in rainbow spots.

## Character roster

All names are working suggestions for Sophia to change. Characters 6–10 are proposed additions, not decisions from Sophia.

| # | Working name | Visual identity | Origin |
| --- | --- | --- | --- |
| 1 | Sir Snortstache | Teal; enormous curled purple mustache | Sophia's request |
| 2 | Professor Wiggles | Lavender; rainbow clown wig | Sophia's request |
| 3 | Lord Wobble | Orange; enormous round belly; substantial visible legs | Sophia's request |
| 4 | Tiny Toes | Lime green; spherical belly; comically tiny legs | Sophia's request |
| 5 | Confetti | Aqua; large distinct rainbow spots | Sophia's request |
| 6 | Nibble | Coral pink; two enormous rounded buck teeth | Proposed |
| 7 | Banana Bob | Sky blue; banana-shaped yellow horns | Proposed |
| 8 | Flapjack | Peach; enormous floppy ears | Proposed |
| 9 | Sir Snoot | Purple; long curling snout | Proposed |
| 10 | Blep | Yellow; enormous floppy pink tongue | Proposed |

## Art direction

- Charming stylized 3D characters, rounded silhouettes, cheerful colors, expressive eyes, and simple readable forms.
- One dominant visual joke per dragon; distinguish characters through shape as well as color.
- Full-body individual references on a plain light studio background, with feet, wings, horns, and tail visible.
- References show relaxed spread stances and three-quarter views. They are concept references, not orthographic turnarounds or finished riggable assets.
- Mustache, wig, ears, teeth, and tongue should remain readable at small mobile-game scale.

## Proposed first playable version

Start with one small arena, one playable character, gems, and one dragon. Move with a touch joystick. Collect the gems while avoiding a clearly signaled fire attack; then celebrate and restart. Add the larger cast after movement and dodging feel fun.

Suggested dragon attack sequence: notice player → exaggerated inhale → clearly visible warning area → brief fire breath → silly recovery. Lock the attack direction before the flame begins so the player has a fair chance to dodge. These are design proposals to playtest, not fixed requirements.

Possible character animation jokes: mustache tips bounce during a sneeze, the wig wobbles during an inhale, Tiny Toes takes rapid little steps, and Blep pulls its tongue in before breathing fire. Keep comedy affectionate; all body shapes can be capable characters.

## 3D production notes

1. Let Sophia choose and revise the designs before spending effort on all ten models.
2. For selected characters, generate consistent front, side, and back references with matching proportions and neutral poses.
3. Generate or model the mesh, then inspect wing attachments, feet, mouth, tail, and any intersecting parts. An attractive reference does not guarantee clean topology.
4. Prepare mobile-suitable geometry and textures. Treat rainbow spots as surface color; sculpt the wig as chunky curls rather than individual hairs.
5. Rig and test idle, walk, turn, inhale, fire, and recovery. Keep flame effects separate from the character mesh.
6. Test one animated dragon on an actual phone before scaling up the cast. Set budgets based on that test rather than guessing a universal polygon limit.

## Decisions for Sophia and Amy

- Who is the playable character?
- Are gems on the ground, on the dragons, or both? The original wording leaves placement open.
- What happens when fire catches the player: a funny soot effect, dropped gems, or a restart?
- Which names and proposed extra dragons does Sophia like?
- Is the camera overhead, behind the character, or side-on?
- Should the first delivery be a mobile browser game or a native app? No engine or framework has been chosen yet.

## Current scope

This initial contribution is reference art and planning notes. It does not contain a playable game, 3D meshes, rigs, or animations.
