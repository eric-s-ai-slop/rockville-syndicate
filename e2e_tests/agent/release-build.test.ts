import { describe, expect, it } from 'vitest';
import { releaseBuildArgs } from '../../scripts/release-build';

const common = {
  imageTag: 'omega:test',
  version: '2.0.0',
  revision: 'abc123',
  buildTime: '2026-07-16T00:00:00.000Z',
};

describe('release Docker build selection', () => {
  it('uses the ordinary Docker builder without implicit CI cache coupling', () => {
    const args = releaseBuildArgs({ ...common, useGhaCache: false });
    expect(args[0]).toBe('build');
    expect(args).not.toContain('buildx');
    expect(args).not.toContain('--cache-from');
  });

  it('uses an explicitly requested, non-fatal GitHub Actions cache export', () => {
    const args = releaseBuildArgs({ ...common, useGhaCache: true });
    expect(args.slice(0, 2)).toEqual(['buildx', 'build']);
    expect(args).toContain('type=gha,scope=omega-release');
    expect(args).toContain('type=gha,scope=omega-release,mode=max,ignore-error=true');
    expect(args).toContain('--load');
  });
});

