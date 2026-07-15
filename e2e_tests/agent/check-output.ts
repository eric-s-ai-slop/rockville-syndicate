export const FAILURE_LIMITS: Record<string, number> = {
  typecheck: 20,
  eslint: 20,
  tests: 35,
  build: 25,
};

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

export interface FailureOutput {
  text: string;
  omittedLines: number;
  totalLines: number;
}

/** Keep agent-visible failures small while the complete log remains on disk. */
export function formatFailureOutput(name: string, output: string, verbose = false): FailureOutput {
  const lines = output.replace(ANSI, '').split('\n').filter(Boolean);
  const limit = FAILURE_LIMITS[name] ?? 60;
  const visible = verbose ? lines : lines.slice(-limit);
  return {
    text: visible.join('\n'),
    omittedLines: verbose ? 0 : Math.max(0, lines.length - visible.length),
    totalLines: lines.length,
  };
}
