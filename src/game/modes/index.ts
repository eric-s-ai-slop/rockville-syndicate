import type { GameMode } from './types';
import { bossFightMode } from './bossFight';
import { poolPartyMode } from './poolParty';

const registry = new Map<string, GameMode>();

registerMode(bossFightMode);
registerMode(poolPartyMode);

export function registerMode(m: GameMode) {
  registry.set(m.id, m);
}

export function getMode(id: string): GameMode | undefined {
  return registry.get(id);
}
