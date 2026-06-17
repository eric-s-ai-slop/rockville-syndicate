import type { GameMode } from './types';
import { bossFightMode } from './bossFight';
import { poolPartyMode } from './poolParty';
import { basementSceneMode } from './basementScene';
import { storyFracturesMode } from './storyFractures';

const registry = new Map<string, GameMode>();

registerMode(bossFightMode);
registerMode(poolPartyMode);
registerMode(basementSceneMode);
registerMode(storyFracturesMode);

export function registerMode(m: GameMode) {
  registry.set(m.id, m);
}

export function getMode(id: string): GameMode | undefined {
  return registry.get(id);
}
