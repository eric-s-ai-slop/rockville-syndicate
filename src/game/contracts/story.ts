/** Public React↔Phaser story bridge payload. Kept outside ChapterScene so
 * modes and UI hooks can share the contract without importing the host. */
export interface StoryDialoguePayload {
  speakerName: string;
  speakerEmoji: string;
  speakerColor: string;
  /** Base64 PNG extracted from the character's sprite sheet frame 0. */
  portraitDataUrl?: string;
  lines: string[];
  /** When present, the box shows choice buttons after the last line. */
  choices?: { text: string }[];
}
