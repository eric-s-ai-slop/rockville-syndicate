import type { ModeResult } from './types';

/** Guard the host callback shared by real input and harness completion. */
export function onceModeCompletion(onComplete: (result: ModeResult) => void): (result: ModeResult) => void {
  let completed = false;
  return (result: ModeResult) => {
    if (completed) return;
    completed = true;
    onComplete(result);
  };
}
