# Visual QA Report: Rockville Syndicate Origins

After reviewing the QA images in `qa/origins/`, here is the report on the visual status.

## 1. Title and Early Scenes (Look Correct)
- **`checkpoint-001.png`**: The chapter title screen renders correctly.
- **`checkpoint-002.png`, `checkpoint-004.png`, `passive-source-001...`, `passive-source-003...`**: These early scenes render perfectly. The game canvas occupies the full width of the screen, there are no camera offsets, and the character is properly positioned within the bounds of the rooms.

## 2. Incorrect Map Theme (`checkpoint-011.png`)
- **Issue**: The scene is set in a dark void/indoor space, but outdoor procedural decorations (bushes, red flowers) are spawning randomly in the background.
- **Cause**: This is a direct violation of the project rule (`AGENTS.md`): *"map.theme drives procedural decoration; do not use indoor themes for outdoor or void scenes."* It appears an outdoor theme is being incorrectly applied to this void map.

## 3. Out-of-Bounds and Camera Offset Issues (Critical)
- **Affected Images**: `passive-source-012...`, `checkpoint-015.png`, `checkpoint-019.png`
- **Issue**: In these later scenes, the visual rendering completely breaks. The intended playable area (a bedroom with a desk, lamp, and bed) is pushed to the right, occupying less than half the screen. The left side is a massive black void.
- **Character Position**: The player character is standing *outside* the walls of the bedroom, floating entirely in the black void on the left.
- **Cause**: This strongly suggests that either the player's spawn coordinates for this scene are incorrect (placing them outside the map geometry), or there is a severe camera bounds issue similar to the pool party chapter, causing the camera to lock onto an out-of-bounds player.

**Recommendations:** 
1. Fix the `map.theme` for the void scene to ensure bushes/flowers don't spawn indoors.
2. Verify the player spawn coordinates and camera bounds configuration for the bedroom scene to ensure the character spawns inside the room and the camera centers properly.
