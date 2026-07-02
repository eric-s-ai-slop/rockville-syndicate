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

export function registerMode(m: GameMode) {
  registry.set(m.id, m);
}

export function getMode(id: string): GameMode | undefined {
  return registry.get(id);
}

export function listModeIds(): string[] {
  return [...registry.keys()];
}
