import { describe, it, expect } from 'vitest';
import {
  CHAPTER_MUSIC_KEY,
  STAGE_MUSIC_URL,
  THEME_FOOTSTEP,
  FOOTSTEP_URLS,
  CROWD_MURMUR_URL,
  CRICKET_AMBIENT_URL,
  SFX_MESSAGE_DING_URL,
  BOSS_MUSIC_URL,
  BOSS_LOOP_URL,
  UI_SELECT_URL,
  VICTORY_JINGLE_URL,
  TYPEWRITER_URL,
  UI_CLICK_URL,
  UI_HOVER_URL,
  UI_PICK_URL,
  UI_BACK_URL,
  UI_TOGGLE_URL,
  UI_CRACK_URL,
  UI_SHATTER_URL,
  DIALOG_BLIP_URL,
  KNOCK_URL
} from './audio';

describe('audio.ts configurations', () => {
  it('CHAPTER_MUSIC_KEY should contain valid chapter to music key mappings', () => {
    expect(CHAPTER_MUSIC_KEY).toBeDefined();
    expect(Object.keys(CHAPTER_MUSIC_KEY).length).toBeGreaterThan(0);

    // Check for some known keys
    expect(CHAPTER_MUSIC_KEY['spotify_insurgency']).toBe('music_ch1');
    expect(CHAPTER_MUSIC_KEY['nyc_1am_drive']).toBe('music_ch2');
  });

  it('STAGE_MUSIC_URL should contain mappings from music keys to valid URL strings', () => {
    expect(STAGE_MUSIC_URL).toBeDefined();

    // Each value must be a string containing a path/url
    Object.values(STAGE_MUSIC_URL).forEach(url => {
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);
    });

    // Keys used in CHAPTER_MUSIC_KEY should be present in STAGE_MUSIC_URL or mapped correctly
    // Note: Some chapters map to the same music key, e.g. music_ch1
    const musicKeys = Object.values(CHAPTER_MUSIC_KEY);
    musicKeys.forEach(key => {
      expect(STAGE_MUSIC_URL).toHaveProperty(key);
      expect(typeof STAGE_MUSIC_URL[key]).toBe('string');
    });
  });

  it('THEME_FOOTSTEP should map theme names to footstep types', () => {
    expect(THEME_FOOTSTEP).toBeDefined();
    expect(THEME_FOOTSTEP['apartment']).toBe('carpet');
    expect(THEME_FOOTSTEP['hospital']).toBe('concrete');

    // Each theme footstep should be valid in FOOTSTEP_URLS
    Object.values(THEME_FOOTSTEP).forEach(footstepType => {
      expect(FOOTSTEP_URLS).toHaveProperty(footstepType);
    });
  });

  it('FOOTSTEP_URLS should map footstep types to arrays of sound URLs', () => {
    expect(FOOTSTEP_URLS).toBeDefined();

    expect(FOOTSTEP_URLS['carpet'].length).toBe(3);
    expect(FOOTSTEP_URLS['wood'].length).toBe(3);
    expect(FOOTSTEP_URLS['concrete'].length).toBe(3);
    expect(FOOTSTEP_URLS['grass'].length).toBe(3);

    Object.values(FOOTSTEP_URLS).forEach(urls => {
      urls.forEach(url => {
        expect(typeof url).toBe('string');
        expect(url.length).toBeGreaterThan(0);
      });
    });
  });

  it('Ambient SFX and other sounds should be defined as URL strings', () => {
    const stringUrls = [
      CROWD_MURMUR_URL,
      CRICKET_AMBIENT_URL,
      SFX_MESSAGE_DING_URL,
      BOSS_MUSIC_URL,
      BOSS_LOOP_URL,
      UI_SELECT_URL,
      VICTORY_JINGLE_URL,
      TYPEWRITER_URL,
      UI_CLICK_URL,
      UI_HOVER_URL,
      UI_PICK_URL,
      UI_BACK_URL,
      UI_TOGGLE_URL,
      UI_CRACK_URL,
      UI_SHATTER_URL,
      DIALOG_BLIP_URL,
      KNOCK_URL
    ];

    stringUrls.forEach(url => {
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);
    });
  });
});
