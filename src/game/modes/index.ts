import type { GameMode } from './types';
import { bossFightMode } from './bossFight';
import { poolPartyMode } from './poolParty';
import { basementSceneMode } from './basementScene';
import { storyFracturesMode } from './storyFractures';
import { stewOfferingMode } from './stewOffering';
import { fratAggroMode } from './fratAggro';
import { silentDriveMode } from './silentDrive';

const registry = new Map<string, GameMode>();

registerMode(bossFightMode);
registerMode(poolPartyMode);
registerMode(basementSceneMode);
registerMode(storyFracturesMode);
registerMode(stewOfferingMode);
registerMode(fratAggroMode);
registerMode(silentDriveMode);

export function registerMode(m: GameMode) {
  registry.set(m.id, m);
}

export function getMode(id: string): GameMode | undefined {
  return registry.get(id);
}
