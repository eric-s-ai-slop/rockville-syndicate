import { describe, it, expect } from 'vitest';
import { DIFFICULTY_MODS, POWER_UPS, BOSSES } from '../../../data/entities';

// ── Pure helpers mirroring the private logic in BossFightMode ─────────────────
// These are inline extractions of the combat math — no Phaser dependency needed.

/** Mirror of damageBoss HP update: clamps at 0. */
function applyBossDamage(currentHp: number, amount: number): number {
  return Math.max(0, currentHp - amount);
}

/** Mirror of damageBoss deflection check for boss_ben_umbc. */
function isPhysicalDeflected(bossId: string, isPhysical: boolean): boolean {
  return isPhysical && bossId === 'boss_ben_umbc';
}

/**
 * A5 fix: the QTE callback uses `damage > 0 ? damage : weaknessQTE.damage`.
 * Before the fix it always used weaknessQTE.damage regardless of selected option.
 */
function resolveQteDamage(successDamage: number, weaknessDamage: number): number {
  return successDamage > 0 ? successDamage : weaknessDamage;
}

// ── DIFFICULTY_MODS ────────────────────────────────────────────────────────────

describe('DIFFICULTY_MODS structure', () => {
  it('boss HP multiplier: easy < normal = 1.0 < hard', () => {
    expect(DIFFICULTY_MODS.easy.bossHp).toBeLessThan(1);
    expect(DIFFICULTY_MODS.normal.bossHp).toBe(1.0);
    expect(DIFFICULTY_MODS.hard.bossHp).toBeGreaterThan(1);
  });

  it('boss speed multiplier: easy < normal = 1.0 < hard', () => {
    expect(DIFFICULTY_MODS.easy.bossSpeed).toBeLessThan(1);
    expect(DIFFICULTY_MODS.normal.bossSpeed).toBe(1.0);
    expect(DIFFICULTY_MODS.hard.bossSpeed).toBeGreaterThan(1);
  });

  it('player damage taken: easy < normal = 1.0 < hard', () => {
    expect(DIFFICULTY_MODS.easy.playerDamageTaken).toBeLessThan(1);
    expect(DIFFICULTY_MODS.normal.playerDamageTaken).toBe(1.0);
    expect(DIFFICULTY_MODS.hard.playerDamageTaken).toBeGreaterThan(1);
  });

  it('attack interval: hard is shorter (lower multiplier) than easy', () => {
    expect(DIFFICULTY_MODS.hard.attackInterval).toBeLessThan(DIFFICULTY_MODS.easy.attackInterval);
  });

  it('power-up drop rate: easy has higher drop rate than hard', () => {
    expect(DIFFICULTY_MODS.easy.powerUpDropRate).toBeGreaterThan(DIFFICULTY_MODS.hard.powerUpDropRate);
  });
});

// ── Boss HP clamping ───────────────────────────────────────────────────────────

describe('boss HP clamping (damageBoss)', () => {
  it('reduces HP by the exact damage amount', () => {
    expect(applyBossDamage(100, 30)).toBe(70);
  });

  it('clamps at 0 when damage exceeds current HP', () => {
    expect(applyBossDamage(50, 100)).toBe(0);
  });

  it('never returns a negative value', () => {
    expect(applyBossDamage(0, 999)).toBe(0);
    expect(applyBossDamage(1, 1000)).toBe(0);
  });

  it('exact kill: damage equal to remaining HP clamps to 0', () => {
    expect(applyBossDamage(40, 40)).toBe(0);
  });
});

// ── boss_ben_umbc physical deflection ─────────────────────────────────────────

describe('boss_ben_umbc physical-hit deflection', () => {
  it('deflects physical attacks on boss_ben_umbc (no HP loss)', () => {
    expect(isPhysicalDeflected('boss_ben_umbc', true)).toBe(true);
  });

  it('does NOT deflect QTE/non-physical damage on boss_ben_umbc', () => {
    expect(isPhysicalDeflected('boss_ben_umbc', false)).toBe(false);
  });

  it('other bosses are NOT deflected by physical attacks', () => {
    expect(isPhysicalDeflected('boss_eric', true)).toBe(false);
    expect(isPhysicalDeflected('boss_nick_f', true)).toBe(false);
    expect(isPhysicalDeflected('boss_audrey', true)).toBe(false);
    expect(isPhysicalDeflected('boss_ben', true)).toBe(false);
  });
});

// ── A5 regression: QTE damage uses the selected option's damage ────────────────

describe('A5 regression — QTE damage resolution', () => {
  it('uses the selected QTE damage when it is positive', () => {
    // Before A5: always fell through to weaknessDamage (40). After fix: 80.
    expect(resolveQteDamage(80, 40)).toBe(80);
  });

  it('falls back to weaknessDamage only when successDamage is 0', () => {
    expect(resolveQteDamage(0, 40)).toBe(40);
  });

  it('different QTE options apply their own damage values, not the weakness damage', () => {
    const highDamageOption = 120;
    const weaknessDamage = 60;
    expect(resolveQteDamage(highDamageOption, weaknessDamage)).toBe(highDamageOption);
    expect(resolveQteDamage(highDamageOption, weaknessDamage)).not.toBe(weaknessDamage);
  });
});

// ── BOSSES config ──────────────────────────────────────────────────────────────

describe('BOSSES config', () => {
  it('every boss has required fields', () => {
    for (const boss of BOSSES) {
      expect(boss.id, `${boss.id} missing id`).toBeTruthy();
      expect(boss.name, `${boss.id} missing name`).toBeTruthy();
      expect(boss.maxHp, `${boss.id} maxHp must be > 0`).toBeGreaterThan(0);
      expect(boss.weaknessQTE, `${boss.id} missing weaknessQTE`).toBeDefined();
      expect(boss.weaknessQTE.damage, `${boss.id} weaknessQTE.damage must be > 0`).toBeGreaterThan(0);
    }
  });

  it('boss HP per difficulty is computed correctly from maxHp × bossHp multiplier', () => {
    const boss = BOSSES[0];
    const easyHp = Math.round(boss.maxHp * DIFFICULTY_MODS.easy.bossHp);
    const normalHp = Math.round(boss.maxHp * DIFFICULTY_MODS.normal.bossHp);
    const hardHp = Math.round(boss.maxHp * DIFFICULTY_MODS.hard.bossHp);
    expect(easyHp).toBeLessThan(normalHp);
    expect(normalHp).toBe(boss.maxHp);
    expect(hardHp).toBeGreaterThan(normalHp);
  });
});

// ── POWER_UPS ─────────────────────────────────────────────────────────────────

describe('POWER_UPS catalog', () => {
  it('every power-up has id, name, and effectType', () => {
    for (const pu of POWER_UPS) {
      expect(pu.id).toBeTruthy();
      expect(pu.name).toBeTruthy();
      expect(pu.effectType).toBeTruthy();
    }
  });

  it('covers all six effectTypes', () => {
    const types = new Set(POWER_UPS.map(p => p.effectType));
    expect(types.has('invincibility')).toBe(true);
    expect(types.has('heal')).toBe(true);
    expect(types.has('poison_aura')).toBe(true);
    expect(types.has('speed_boost')).toBe(true);
    expect(types.has('defense_buff')).toBe(true);
    expect(types.has('brainrot_clear')).toBe(true);
  });

  it('instant effects (heal, brainrot_clear) have durationMs of 0', () => {
    const healPu = POWER_UPS.find(p => p.effectType === 'heal');
    const clearPu = POWER_UPS.find(p => p.effectType === 'brainrot_clear');
    expect(healPu?.durationMs).toBe(0);
    expect(clearPu?.durationMs).toBe(0);
  });

  it('timed effects have positive durationMs', () => {
    const timed = POWER_UPS.filter(p => p.durationMs > 0);
    expect(timed.length).toBeGreaterThan(0);
  });
});

// ── damagePlayer difficulty scaling ───────────────────────────────────────────

describe('damagePlayer difficulty scaling', () => {
  const baseDamage = 35;

  it('easy mode reduces incoming damage', () => {
    const easy = Math.round(baseDamage * DIFFICULTY_MODS.easy.playerDamageTaken);
    const normal = Math.round(baseDamage * DIFFICULTY_MODS.normal.playerDamageTaken);
    expect(easy).toBeLessThan(normal);
  });

  it('normal mode applies damage at face value', () => {
    const result = Math.round(baseDamage * DIFFICULTY_MODS.normal.playerDamageTaken);
    expect(result).toBe(baseDamage);
  });

  it('hard mode increases incoming damage', () => {
    const hard = Math.round(baseDamage * DIFFICULTY_MODS.hard.playerDamageTaken);
    const normal = Math.round(baseDamage * DIFFICULTY_MODS.normal.playerDamageTaken);
    expect(hard).toBeGreaterThan(normal);
  });
});
