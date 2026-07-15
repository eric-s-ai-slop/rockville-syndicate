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
import type { BenF1PlanModeConfig } from '../game/modes/benF1Plan';
import type { BenRoofHeistConfig } from '../game/modes/benRoofHeist';
import type { BenRustRaidConfig } from '../game/modes/benRustRaid';
import type { BenOutbreakConfig } from '../game/modes/benOutbreak';
import type { BenPoolShotConfig } from '../game/modes/benPoolShot';
import type { BenCircuitLabConfig } from '../game/modes/benCircuitLab';

export const MODE_IDS = [
  'bossFight', 'poolParty', 'basementScene', 'storyFractures', 'stewOffering',
  'fratAggro', 'silentDrive', 'groupChat', 'carRide', 'complicityReport',
  'benTrivia', 'battleiq-battle', 'speakerHunt', 'cabinCollapse',
  'swarmSurvival', 'doubleCall',
  'benF1Plan', 'benRoofHeist', 'benRustRaid', 'benOutbreak', 'benPoolShot', 'benCircuitLab',
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
  benF1Plan: BenF1PlanModeConfig;
  benRoofHeist: BenRoofHeistConfig;
  benRustRaid: BenRustRaidConfig;
  benOutbreak: BenOutbreakConfig;
  benPoolShot: BenPoolShotConfig;
  benCircuitLab: BenCircuitLabConfig;
}

export type ModeId = typeof MODE_IDS[number];

type UnlistedConfigModes = Exclude<keyof ModeConfigMap, ModeId>;
const allConfigModesAreListed: UnlistedConfigModes extends never ? true : never = true;
void allConfigModesAreListed;
