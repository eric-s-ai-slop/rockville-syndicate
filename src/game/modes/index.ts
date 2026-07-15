import type { GameMode } from './types';
import { bossFightMode } from './bossFight';
import { poolPartyMode } from './poolParty';
import { basementSceneMode } from './basementScene';
import { storyFracturesMode } from './storyFractures';
import { stewOfferingMode } from './stewOffering';
import { fratAggroMode } from './fratAggro';
import { silentDriveMode } from './silentDrive';
import { groupChatMode } from './groupChat';
import { carRideMode } from './carRide';
import { complicityReportMode } from './complicityReport';
import { benTriviaMode } from './benTrivia';
import { createExternalGameMode } from './external';
import { speakerHuntMode } from './speakerHunt';
import { cabinCollapseMode } from './cabinCollapse';
import { swarmSurvivalMode } from './swarmSurvival';
import { doubleCallMode } from './doubleCall';
import { benF1PlanMode } from './benF1Plan';
import { benRoofHeistMode } from './benRoofHeist';
import { benRustRaidMode } from './benRustRaid';
import { benOutbreakMode } from './benOutbreak';
import { benPoolShotMode } from './benPoolShot';
import { benCircuitLabMode } from './benCircuitLab';

const registry = new Map<string, GameMode>();

registerMode(bossFightMode);
registerMode(poolPartyMode);
registerMode(basementSceneMode);
registerMode(storyFracturesMode);
registerMode(stewOfferingMode);
registerMode(fratAggroMode);
registerMode(silentDriveMode);
registerMode(groupChatMode);
registerMode(carRideMode);
registerMode(complicityReportMode);
registerMode(benTriviaMode);
registerMode(createExternalGameMode({ id: 'battleiq-battle', gameId: 'battleiq' }));
registerMode(speakerHuntMode);
registerMode(cabinCollapseMode);
registerMode(swarmSurvivalMode);
registerMode(doubleCallMode);
registerMode(benF1PlanMode);
registerMode(benRoofHeistMode);
registerMode(benRustRaidMode);
registerMode(benOutbreakMode);
registerMode(benPoolShotMode);
registerMode(benCircuitLabMode);

export function registerMode(m: GameMode) {
  registry.set(m.id, m);
}

export function getMode(id: string): GameMode | undefined {
  return registry.get(id);
}

export function listModeIds(): string[] {
  return [...registry.keys()];
}

export type { GameMode };
