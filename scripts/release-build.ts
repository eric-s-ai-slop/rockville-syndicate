export interface ReleaseBuildArgs {
  useGhaCache: boolean;
  imageTag: string;
  version: string;
  revision: string;
  buildTime: string;
}

export function releaseBuildArgs(input: ReleaseBuildArgs): string[] {
  const prefix = input.useGhaCache
    ? [
        'buildx', 'build',
        '--cache-from', 'type=gha,scope=omega-release',
        '--cache-to', 'type=gha,scope=omega-release,mode=max,ignore-error=true',
        '--load',
      ]
    : ['build'];
  return [
    ...prefix,
    '--file', 'Dockerfile', '--tag', input.imageTag,
    '--build-arg', `OMEGA_VERSION=${input.version}`,
    '--build-arg', `OMEGA_REVISION=${input.revision}`,
    '--build-arg', `OMEGA_BUILD_TIME=${input.buildTime}`,
    '.',
  ];
}

