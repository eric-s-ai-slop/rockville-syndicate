export class MariaBrookeStats {
  public laughs: number = 0;
  public truthsTyped: number = 0;
  public firstTruthPhase: 'early' | 'mid' | 'late' | null = null;
  public lookUps: number = 0;
  public pressureIgnored: number = 0;
  public finalResolve: number = 0;
  public messagesSent: number = 0;

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
