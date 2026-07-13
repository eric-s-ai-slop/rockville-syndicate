import stageWjClassroomUrl from '../../../assets/chapters/maria_brooke/stage_wj_classroom.jpg?url';
import stageWjTrackUrl from '../../../assets/chapters/maria_brooke/stage_wj_track.jpg?url';
import type { ChapterAssetManifest } from './types';

export const mariaBrookeAssets = [
  { key: 'stage_wj_classroom', url: stageWjClassroomUrl },
  { key: 'stage_wj_track', url: stageWjTrackUrl },
] as const satisfies ChapterAssetManifest;
