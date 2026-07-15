# Ben’s Life — Schema Outline

**Status:** Approved outline — ready for the next pipeline agent.

## Chapter Reading

*Ben’s Life* is a 90% roast anthology whose escalation is Ben’s solutions getting more elaborate and less defensible. The group turns each object and quote into permanent lore, then briefly hesitates at the scenic overlook without trying to explain him away.

There is no boss fight. The Formula One career plan is the comic climax.

## Beat Outline

### Act I — Restricted Areas

1. **Narrator** — Open at 51 Monroe: locked door, unreasonable stakes.
2. **WalkTo** — Approach the roof door at the generated landing.
3. **Dialogue — Nick F** — Relay Ben’s pressure-cooker proposal.
4. **Minigame** — Roof planner assembles the absurd operation.
5. **Narrator** — Plan complete; door still locked.
6. **Vignette** — Dying iPhone SE interrupts the exit.
7. **ChangeScene** — Move to the quarantine bedroom.

### Act II — Counter-Surveillance

8. **Narrator** — Router restriction becomes a Raspberry Pi countermeasure.
9. **Dialogue — Ben** — Establish the unexplained “getting ready for bed” ritual.
10. **WalkTo** — Check Ben’s computer setup.
11. **Minigame** — Rust panic: mute, monitor off, headset thrown, bed dive.
12. **Dialogue — Ben** — “MICHEAL IS PICKING MY LOCK.”
13. **Narrator** — Preserve the spelling as evidence.
14. **Choice** — Tell Ben his camera is on, watch silently, or ask whether everyone sees it.
15. **Narrator** — Everyone sees it.
16. **ChangeScene** — Move to Ocean City.

### Act III — Ben Becomes Ben

17. **Narrator** — Present the Brooks and wife beater as legendary equipment.
18. **Dialogue — Ben** — Announce the toilet-water stunt; the group realizes too late he means it.
19. **Minigame** — Patient Zero survival begins after the scripted drink.
20. **Narrator** — Assign Ben blame regardless of the transmission chain.
21. **Vignette** — G-force training: resistance bands, total confidence, no dignity.
22. **ChangeScene** — Move to Mahargo’s pool room.

### Act IV — The Golden Age

23. **Narrator** — Introduce Colleen’s dry snap as a full tactical emergency.
24. **Minigame** — Colleen analysis: every option produces another unhelpful snap.
25. **WalkTo** — Approach the pool table.
26. **Dialogue** — “Hit this pool ball for Colleen.”
27. **Minigame** — Pool shot: Ben misses; timing only changes the severity.
28. **ChangeScene** — Move to the Halloween party.
29. **Narrator** — Record “Who invited this kid?” as permanent archive material.
30. **Vignette** — Parents’ alc and “I’m hip.”
31. **Vignette** — Maria Brooke callback only; its separate chapter remains authoritative.
32. **Vignette** — Brown bag and sippy cup become visual evidence.
33. **ChangeScene** — Move to the junior classroom.
34. **WalkTo** — Read the whiteboard.
35. **Minigame** — Run the existing `benTrivia` mode.
36. **Choice** — Add an accurate entry, defend a real ability, or send Ben the photo.
37. **Narrator** — Bridge from the whiteboard to the racing plan.
38. **ChangeScene** — Move to the F1 arena.

### Act IV Climax — The Bridge-Born Champion

39. **Dialogue — Sean** — Relay the distant-facility job and $15/hour arithmetic.
40. **Minigame** — Reveal the Formula One plan: neck training, job, bridge housing, suit without kart, Dubai.
41. **Dialogue — Ben** — Insist the kart comes later; name yachts as the outcome.
42. **Narrator** — Formally record “Dubai bitches.”
43. **ChangeScene** — Move to engineering class.

### Act V — Portable Electrical Hazard

44. **Narrator** — Ben now carries a car battery to school.
45. **WalkTo** — Inspect the engineering workbench.
46. **Minigame** — Connect battery, terminals, graphite, sparks, and smoke.
47. **Narrator** — The substitute’s attention remains at zero.
48. **Narrator** — Land the equipment progression: iPhone → Raspberry Pi → sippy cup → racing suit → car battery.
49. **ChangeScene** — Move to the scenic overlook.

### Coda — The Overlook

50. **Narrator** — Frame this clearly as Maharko’s secondhand account.
51. **Dialogue — Maharko** — Recount the dark car, lights off, and “Dude, dude, just go to sleep.”
52. **WalkTo** — Sit with Ben at the overlook.
53. **Dialogue — Maharko** — Ben cannot go home; the scene holds in silence.
54. **Narrator** — Maharko eventually drives Ben home.
55. **Narrator** — Ben drifted away; the Dubai bitches are still waiting.
56. **EndChapter** — End quietly after the coda.

## Schema Notes for Handoff

- Use the generated-map coordinates from the completed map context when writing the final TypeScript beats.
- Colleen, Nick Cox, Yvonne, the Ocean City girls, and the substitute are background figures. Relay their quotes through a canonical speaker or the narrator; do not assign them dialogue beats.
- Keep regular choices to one per act: the camera-left-on choice in Act II and the whiteboard choice in Act IV. The coda has no player rescue choice.
- Treat `02b_MECHANIC_BENS_LIFE.md` as binding for minigame behavior. This outline only specifies where each game sits in the story and what follows it.
- Do not add a combat boss fight.

## Coordinate Ledger Used by the Beats

All generated stages use a 920 × 660 map with the player spawning near bottom-center. These are the handoff coordinates used by `walkTo` beats; the map agent or integration agent should preserve them when assembling the final scene configs.

| Scene | Location | Walk target | Coordinates |
| --- | --- | --- | --- |
| 0 | 51 Monroe roof landing | Locked roof door | `(460, 180)` |
| 1 | Quarantine bedroom | Ben’s computer | `(690, 270)` |
| 2 | Ocean City rental | Ben and the toilet-water setup | `(520, 250)` |
| 3 | Mahargo’s pool room | Pool table | `(470, 315)` |
| 5 | Junior classroom | Things Ben Can Do / Can’t Do board | `(460, 255)` |
| 7 | Engineering classroom | Workbench / car battery | `(460, 430)` |
| 8 | Scenic overlook | Ben in the car | `(400, 400)` |

## Approved TypeScript Handoff

The mode IDs below are the IDs proposed by the mechanic spec. Their runtime implementations and exact typed config interfaces belong to the mechanic/implementation agent; the schema fixes their narrative placement and scenario identity.

```ts
import type { Beat, ChapterConfig } from './types';

const bensLifeBeats: Beat[] = [
  // ── Act I — Restricted Areas ─────────────────────────────────────────────
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      '51 Monroe. The first unmistakable Ben incident.',
      'A normal locked door has produced a plan with military requirements.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'ben',
    lines: [
      'I can get onto the roof.',
      'The final door is the only issue.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'nick_f',
    lines: [
      'Honestly though, maybe we could try the normal door things first?',
      'Ben has already moved past normal door things.',
    ],
  },
  { type: 'walkTo', x: 460, y: 180, radius: 75, markerLabel: 'Approach the locked roof door' },
  {
    type: 'minigame',
    modeId: 'benMemoryGame',
    config: { scenario: 'roofPlanner' },
    introLines: [
      'The lock is ordinary.',
      'Ben’s proposed response is not.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'PRESSURE COOKER. M4. ELEVEN HOSTAGES.',
      'The door remains locked.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'ben',
    lines: [
      'My phone is about to die.',
      'It has been about to die for two years.',
    ],
  },
  { type: 'sfx', key: 'sfx_message_ding', volume: 0.5 },
  { type: 'changeScene', sceneIndex: 1, transitionMs: 850 },

  // ── Act II — Counter-Surveillance ────────────────────────────────────────
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'Quarantine. The internet is disabled after eight.',
      'Ben has responded with a Raspberry Pi and the posture of a fugitive.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'ben',
    lines: [
      'I have to get ready for bed.',
      'It is going to take an hour.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'jordan',
    lines: [
      'He is dressed for bed.',
      'He is also returning to Rust.',
    ],
  },
  { type: 'walkTo', x: 690, y: 270, radius: 70, markerLabel: 'Check Ben’s late-night operation' },
  {
    type: 'minigame',
    modeId: 'benMemoryGame',
    config: { scenario: 'rustPanic' },
    introLines: [
      'Footsteps in the hallway.',
      'The door handle is moving.',
    ],
  },
  { type: 'sfx', key: 'sfx_door_open', volume: 0.7 },
  {
    type: 'dialogue',
    speaker: 'ben',
    lines: ['MICHEAL IS PICKING MY LOCK.'],
  },
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'The spelling was preserved.',
      'So was the panic.',
    ],
  },
  {
    type: 'choice',
    speaker: 'jordan',
    prompt: 'Ben muted himself but left the camera on. What does the call do?',
    options: [
      {
        text: 'Tell Ben immediately.',
        reactionSpeaker: 'jordan',
        reactionLines: ['We tell him. Eventually.'],
      },
      {
        text: 'Say nothing and keep watching.',
        reactionSpeaker: 'maharko',
        reactionLines: ['Bro, this is live television.'],
      },
      {
        text: 'Ask whether everyone can see this.',
        reactionSpeaker: 'narrator',
        reactionLines: ['Everyone could see it. That was the problem.'],
      },
    ],
  },
  { type: 'changeScene', sceneIndex: 2, transitionMs: 850 },

  // ── Act III — Ben Becomes Ben ────────────────────────────────────────────
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'Summer after sophomore year. Ocean City.',
      'The Brooks are unrecoverable. The wife beater is apparently a uniform.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'ben',
    lines: [
      'Watch this.',
      'No, seriously. Watch this.',
    ],
  },
  { type: 'walkTo', x: 520, y: 250, radius: 75, markerLabel: 'See what Ben is about to do' },
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'Ben drinks toilet water through a straw in front of the Ocean City girls.',
      'The group has never found a second explanation.',
    ],
  },
  {
    type: 'minigame',
    modeId: 'benHazard',
    config: { scenario: 'patientZero' },
    introLines: [
      'The cough cloud is spreading.',
      'TIME UNTIL ERIC GETS SICK.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'TRANSMISSION CHAIN: COMPLETELY UNVERIFIED.',
      'BLAME ASSIGNED TO BEN ANYWAY.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'ben',
    lines: [
      'G-force training.',
      'You have to strengthen the neck.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'maharko',
    lines: [
      'Bro, it is literally a resistance band around his head.',
      'He is training like the wall is moving.',
    ],
  },
  { type: 'changeScene', sceneIndex: 3, transitionMs: 850 },

  // ── Act IV — The Golden Age ──────────────────────────────────────────────
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'Junior year. Mahargo’s pool room.',
      'Colleen has sent Ben half a ceiling. Ben has opened an investigation.',
    ],
  },
  {
    type: 'minigame',
    modeId: 'benMemoryGame',
    config: { scenario: 'colleenAnalysis' },
    introLines: [
      'Reply delay. Camera angle. Face percentage.',
      'Every decision is being treated as strategy.',
    ],
  },
  { type: 'walkTo', x: 470, y: 315, radius: 90, markerLabel: 'Take the pool shot for Colleen' },
  {
    type: 'dialogue',
    speaker: 'jordan',
    lines: ['Hit this pool ball for Colleen.'],
  },
  {
    type: 'minigame',
    modeId: 'benMemoryGame',
    config: { scenario: 'poolShot' },
    introLines: [
      'The camera is cinematic.',
      'The outcome is not.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'The cue passes directly over the ball.',
      'Colleen does not see it. The failure still feels romantic.',
    ],
  },
  { type: 'changeScene', sceneIndex: 4, transitionMs: 850 },
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'Halloween party. The room is full of people who were invited.',
      'A guy sees Ben and asks, “Who invited this kid?”',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'ben',
    lines: [
      'Dude, I’m so drunk.',
      'Parents’ alc.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'sean',
    lines: [
      'Ben says he is hip.',
      'Benjamin got no play.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'Maria Brooke was a separate operation.',
      'Ben almost skipped track practice for a fictional volleyball game.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'Brown grocery bag. Peanut butter and jelly.',
      'Then the sippy cup appears. The equipment progression has begun.',
    ],
  },
  { type: 'changeScene', sceneIndex: 5, transitionMs: 850 },
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'The classroom whiteboard becomes a public document.',
      'Things Ben Can Do. Things Ben Can’t Do. No context supplied.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'jordan',
    lines: [
      'We need categories.',
      'The categories are not legally binding.',
    ],
  },
  { id: 'whiteboard_retry', type: 'walkTo', x: 460, y: 255, radius: 95, markerLabel: 'Read the whiteboard' },
  {
    type: 'minigame',
    modeId: 'benTrivia',
    config: { count: 18, perPromptMs: 3000, minPromptMs: 1800, strikesAllowed: 6, seed: 13 },
    loseGoto: 'whiteboard_retry',
    introLines: [
      'Sort the claims.',
      'Teachers and random students are watching.',
    ],
  },
  {
    type: 'choice',
    speaker: 'jordan',
    prompt: 'The board is full. What enters the archive?',
    options: [
      {
        text: 'Add one accurate thing Ben can do.',
        reactionSpeaker: 'jordan',
        reactionLines: ['One genuine ability. Defended under protest.'],
      },
      {
        text: 'Add another impossible rule.',
        reactionSpeaker: 'narrator',
        reactionLines: ['The board becomes more official.'],
      },
      {
        text: 'Send the photograph to Ben.',
        reactionSpeaker: 'ben',
        reactionLines: ['Why is everybody sending me this?'],
      },
    ],
  },
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'The whiteboard has done its work.',
      'Sean now reports the Formula One plan.',
    ],
  },
  { type: 'changeScene', sceneIndex: 6, transitionMs: 850 },

  // ── Act IV Climax — The Bridge-Born Champion ─────────────────────────────
  {
    type: 'dialogue',
    speaker: 'sean',
    lines: [
      'He gets a job at a racing facility far away.',
      'It pays around fifteen dollars an hour.',
      'He sleeps under a bridge. Then he buys the suit.',
    ],
  },
  {
    type: 'minigame',
    modeId: 'benF1Plan',
    config: { scenario: 'bridgeBornChampion' },
    introLines: [
      'Ask the next question.',
      'Every answer removes another normal option.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'ben',
    lines: [
      'The kart comes later.',
      'Bitches on yachts.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'CAREER PLAN: FULLY DOCUMENTED.',
      'DUBAI BITCHES ADDED TO GROUP VOCABULARY.',
    ],
  },
  { type: 'changeScene', sceneIndex: 7, transitionMs: 850 },

  // ── Act V — Portable Electrical Hazard ───────────────────────────────────
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'Senior year. Ben brings a car battery into engineering class.',
      'The equipment has become portable.',
    ],
  },
  { type: 'walkTo', x: 460, y: 430, radius: 90, markerLabel: 'Inspect Ben’s classroom workbench' },
  {
    type: 'dialogue',
    speaker: 'ben',
    lines: [
      'I can make the graphite glow.',
      'Watch the substitute. He does not care.',
    ],
  },
  {
    type: 'minigame',
    modeId: 'benMemoryGame',
    config: { scenario: 'portableElectricalHazard' },
    introLines: [
      'Reveal the battery.',
      'Short the terminals. Make the graphite glow.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'The graphite becomes extremely bright and begins smoking.',
      'ADULT INTERVENTION: NONE.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'iPhone. Raspberry Pi. Sippy cup. Racing suit. Car battery.',
      'The equipment arc is complete.',
    ],
  },
  { type: 'changeScene', sceneIndex: 8, transitionMs: 950 },

  // ── Coda — The Overlook ──────────────────────────────────────────────────
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'One story was different because Eric was not there.',
      'Maharko remembers the overlook.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'maharko',
    lines: [
      'Ben asked me to turn off the lights.',
      'Then he said, “Dude, dude, just go to sleep.”',
    ],
  },
  { type: 'walkTo', x: 400, y: 400, radius: 90, markerLabel: 'Sit with Ben at the overlook' },
  {
    type: 'dialogue',
    speaker: 'maharko',
    lines: [
      'He said he could not go home.',
      'So we stayed there in the dark for a while.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'Maharko eventually drives him home.',
      'The group does not turn this part into a theory.',
    ],
  },
  {
    type: 'dialogue',
    speaker: 'narrator',
    lines: [
      'Ben drifted from the group.',
      'The Dubai bitches are still waiting.',
    ],
  },
  { type: 'endChapter' },
];

const chapter13BensLife: ChapterConfig = {
  id: 'bens_life',
  index: 13,
  title: 'Ben’s Life',
  subtitle: 'The Only Known Man With a Sippy Cup and a Car Battery',
  location: '51 Monroe → I-270 Scenic Overlook',
  description: 'A chronological roast compilation of Ben’s locked doors, impossible plans, and increasingly portable hazards.',
  kind: 'chapter',

  // Paste Scene 0’s completed map and actors here from the map-agent handoff.
  map: /* Scene 0 MapConfig */,
  actors: /* Scene 0 ActorPlacement[] */,

  // Paste the completed nine-scene map/actor package here, in the order used by
  // the changeScene beats above: 51 Monroe, quarantine bedroom, Ocean City,
  // pool room, Halloween party, junior classroom, F1 arena, engineering, overlook.
  scenes: /* ChapterSceneConfig[] */,

  beats: bensLifeBeats,
};

export default chapter13BensLife;
```

## Schema Agent Notes

- Least certain line: “The group does not turn this part into a theory.” It is faithful to the brief’s instruction not to explain Ben psychologically, but should be softened or cut if the group’s actual register would not say it.
- The coordinate ledger above is inferred from the generated-stage composition. Confirm it against the final map-agent TypeScript before pasting into `src/data/chapters/`.
- The handoff intentionally does not define minigame mechanics or create their TypeScript mode contracts. Those stay with the mechanic and implementation agents.
