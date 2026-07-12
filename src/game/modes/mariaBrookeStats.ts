export interface MariaBrookeStatsSnapshot {
  laughs: number;
  truthsTyped: number;
  firstTruthPhase: 'early' | 'mid' | 'late' | null;
  lookUps: number;
  pressureIgnored: number;
  finalResolve: number;
  messagesSent: number;
}

export class MariaBrookeStats {
  public laughs: number = 0;
  public truthsTyped: number = 0;
  public firstTruthPhase: 'early' | 'mid' | 'late' | null = null;
  public lookUps: number = 0;
  public pressureIgnored: number = 0;
  public finalResolve: number = 0;
  public messagesSent: number = 0;

  public snapshot(): MariaBrookeStatsSnapshot {
    return {
      laughs: this.laughs,
      truthsTyped: this.truthsTyped,
      firstTruthPhase: this.firstTruthPhase,
      lookUps: this.lookUps,
      pressureIgnored: this.pressureIgnored,
      finalResolve: this.finalResolve,
      messagesSent: this.messagesSent,
    };
  }

  public restore(snapshot: MariaBrookeStatsSnapshot): void {
    this.laughs = snapshot.laughs;
    this.truthsTyped = snapshot.truthsTyped;
    this.firstTruthPhase = snapshot.firstTruthPhase;
    this.lookUps = snapshot.lookUps;
    this.pressureIgnored = snapshot.pressureIgnored;
    this.finalResolve = snapshot.finalResolve;
    this.messagesSent = snapshot.messagesSent;
  }

  public reset(): void {
    this.laughs = 0;
    this.truthsTyped = 0;
    this.firstTruthPhase = null;
    this.lookUps = 0;
    this.pressureIgnored = 0;
    this.finalResolve = 0;
    this.messagesSent = 0;
  }
}

export const mariaBrookeStats = new MariaBrookeStats();
