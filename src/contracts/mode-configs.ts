/** Cross-layer mode configuration contracts plus the canonical runtime ID tuple.
 * All mode imports are type-only, so chapter content does not pull Phaser into runtime. */
import type { GroupChatConfig } from '../game/modes/groupChat';
import type { SpeakerHuntConfig } from '../game/modes/speakerHunt';
import type { CabinCollapseConfig } from '../game/modes/cabinCollapse';
import type { StoryFracturesConfig } from '../game/modes/storyFractures';
import type { SilentDriveConfig } from '../game/modes/silentDrive';
import type { CarRideConfig } from '../game/modes/carRide/carRide';
import type { BenTriviaConfig } from '../game/modes/benTrivia';
import type { SwarmSurvivalConfig } from '../game/modes/swarmSurvival';
import type { DoubleCallConfig } from '../game/modes/doubleCall';

export const MODE_IDS = [
  'bossFight', 'poolParty', 'basementScene', 'storyFractures', 'stewOffering',
  'fratAggro', 'silentDrive', 'groupChat', 'carRide', 'complicityReport',
  'benTrivia', 'battleiq-battle', 'speakerHunt', 'cabinCollapse',
  'swarmSurvival', 'doubleCall',
] as const;

export interface ModeConfigMap {
  bossFight: never;
  poolParty: undefined;
  basementScene: undefined;
  storyFractures: StoryFracturesConfig;
  stewOffering: undefined;
  fratAggro: undefined;
  silentDrive: SilentDriveConfig;
  groupChat: GroupChatConfig;
  carRide: CarRideConfig;
  complicityReport: Record<string, never>;
  benTrivia: BenTriviaConfig;
  'battleiq-battle': { enemyId?: string; [key: string]: unknown };
  speakerHunt: SpeakerHuntConfig;
  cabinCollapse: CabinCollapseConfig;
  swarmSurvival: SwarmSurvivalConfig;
  doubleCall: DoubleCallConfig;
}

export type ModeId = typeof MODE_IDS[number];

type UnlistedConfigModes = Exclude<keyof ModeConfigMap, ModeId>;
const allConfigModesAreListed: UnlistedConfigModes extends never ? true : never = true;
void allConfigModesAreListed;
