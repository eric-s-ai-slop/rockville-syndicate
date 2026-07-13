export interface ChapterImageAsset {
  readonly key: string;
  readonly url: string;
}

export type ChapterAssetManifest = readonly ChapterImageAsset[];
