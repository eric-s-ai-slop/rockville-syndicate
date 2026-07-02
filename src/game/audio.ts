// Phase E audio assets — all imported via Vite ?url so special chars in filenames
// (spaces, parens) don't need renaming.

import ch1Url            from '../assets/audio/stage_music/commons1522(coffee beabadobee).mp3?url';
import ch2Url            from '../assets/audio/stage_music/night_highway(nightcall kavinsky).mp3?url';
import umbcBasementUrl   from '../assets/audio/stage_music/Justin Bieber, Nicki Minaj  Beauty And A Beat (Lyrics)(umbc).mp3?url';
import crowdMurmurUrl    from '../assets/audio/stage_music/People Talking - Sound Effect.mp3?url';
import cricketAmbientUrl from '../assets/audio/stage_music/cricket on a summer night  Cricket sound effects  Copyright Free Nature sounds.mp3?url';
import ch3Url   from '../assets/audio/stage_music/hospital(flight from the city).mp3?url';
import ch4Url   from '../assets/audio/stage_music/jungle_gym(BorderlineTameImpala).mp3?url';
import ch5Url   from '../assets/audio/stage_music/Jordan_and_maharko_music_for_map (6).mp3?url';
import ch6Url   from '../assets/audio/stage_music/ben_music(in the hall of the mountian king).mp3?url';
import ch7Url          from '../assets/audio/stage_music/chapter7PASTEL GHOST  DARK BEACH.mp3?url';
import ch7MariaBrookeUrl from '../assets/audio/stage_music/Craspore - Flashbacks (slowed).mp3?url';
import ch9Url   from '../assets/audio/stage_music/SUMMER2026_FIRSTPOOLPARTY(Glass Animals - Heat Waves).mp3?url';
import ch11SpinsUrl from '../assets/audio/stage_music/chapter11 the spins (mac miller).mp3?url';
import ch11SpaceSongUrl from '../assets/audio/stage_music/chapter11 space song (beach house).mp3?url';
import sfxMessageDingUrl from '../assets/audio/IPHONE NOTIFICATION SOUND EFFECT (PINGDING).mp3?url';
import bossUrl  from '../assets/audio/boss_music/Prowler Sound Effect.mp3?url';
import bossTetrisUrl from '../assets/audio/boss_music/Techno - Tetris (Remix).mp3?url';
import ultraphonkUrl from '../assets/audio/ultraphonk (phonk).mp3?url';

import fc0 from '../assets/audio/kenney_impact-sounds/Audio/footstep_carpet_000.ogg?url';
import fc1 from '../assets/audio/kenney_impact-sounds/Audio/footstep_carpet_001.ogg?url';
import fc2 from '../assets/audio/kenney_impact-sounds/Audio/footstep_carpet_002.ogg?url';
import fw0 from '../assets/audio/kenney_impact-sounds/Audio/footstep_wood_000.ogg?url';
import fw1 from '../assets/audio/kenney_impact-sounds/Audio/footstep_wood_001.ogg?url';
import fw2 from '../assets/audio/kenney_impact-sounds/Audio/footstep_wood_002.ogg?url';
import fn0 from '../assets/audio/kenney_impact-sounds/Audio/footstep_concrete_000.ogg?url';
import fn1 from '../assets/audio/kenney_impact-sounds/Audio/footstep_concrete_001.ogg?url';
import fn2 from '../assets/audio/kenney_impact-sounds/Audio/footstep_concrete_002.ogg?url';
import fg0 from '../assets/audio/kenney_impact-sounds/Audio/footstep_grass_000.ogg?url';
import fg1 from '../assets/audio/kenney_impact-sounds/Audio/footstep_grass_001.ogg?url';
import fg2 from '../assets/audio/kenney_impact-sounds/Audio/footstep_grass_002.ogg?url';

import uiSelectUrl   from '../assets/audio/kenney_interface-sounds/Audio/select_004.ogg?url';
import victoryUrl    from '../assets/audio/kenney_music-jingles/Audio/Steel jingles/jingles_STEEL03.ogg?url';

// chapter id → Phaser audio key for stage music
// umbc_incident: no chapter-level key — per-scene music handles it via scenes[].music.
//   Scene 0: 'music_umbc_basement' ("Beauty and a Beat")
//   Scene 1: 'music_ch2' (Nightcall — Kavinsky, already loaded)
export const CHAPTER_MUSIC_KEY: Record<string, string> = {
  spotify_insurgency:   'music_ch1',
  nyc_1am_drive:        'music_ch2',
  red_pee_bladder:      'music_ch3',
  jungle_gym_gambit:    'music_ch4',
  florida_highway_duel: 'music_ch5',
  ding_dong_ditch_ben:  'music_ch6',
  maria_brooke:         'music_maria_brooke',
  spain_betrayal:       'music_ch7',
  cabin_basye:          'music_ch7',  // Dark Beach (Pastel Ghost) — moody night-cabin atmosphere
  suds_and_soles_pool_party: 'music_ch9',
  // cabin_from_hell_2025: no chapter-level key — per-scene music handles it via scenes[].music.
  //   Scene 0: 'music_ch11_spins' ("The Spins" — Mac Miller), crossfades to
  //   'music_ch11_space_song' ("Space Song" — Beach House) mid-scene via a
  //   `changeMusic` beat at the Act 1 turn. Scenes 1 & 2 continue on 'music_ch11_space_song'.
};

// Phaser audio key → URL, for preloading only this chapter's track
export const STAGE_MUSIC_URL: Record<string, string> = {
  music_ch1:           ch1Url,
  music_ch2:           ch2Url,
  music_ch3:           ch3Url,
  music_ch4:           ch4Url,
  music_ch5:           ch5Url,
  music_ch6:           ch6Url,
  music_ch7:           ch7Url,
  music_maria_brooke:  ch7MariaBrookeUrl,
  music_ch9:           ch9Url,
  music_umbc_basement: umbcBasementUrl,
  music_ch11_spins:      ch11SpinsUrl,
  music_ch11_space_song: ch11SpaceSongUrl,
};

// Ambient SFX (not stage music — loaded via ChapterScene preload)
export const CROWD_MURMUR_URL    = crowdMurmurUrl;    // sfx_crowd_murmur: basement cameraPan
export const CRICKET_AMBIENT_URL = cricketAmbientUrl;  // sfx_parking_ambient: storyFractures mode

export const SFX_MESSAGE_DING_URL = sfxMessageDingUrl;  // groupChat minigame — DM notification
export const ULTRAPHONK_URL = ultraphonkUrl;  // speakerHunt minigame — diegetic Nights 1-3 loop

export const BOSS_MUSIC_URL = bossUrl;   // Prowler sting (plays once on boss intro)
export const BOSS_LOOP_URL = bossTetrisUrl; // Techno-Tetris loop (plays after sting)

// theme → footstep surface variant
export const THEME_FOOTSTEP: Record<string, string> = {
  apartment:     'carpet',
  highway_night: 'concrete',
  hospital:      'concrete',
  park:          'grass',
  florida:       'concrete',
  suburb_night:  'concrete',
  cabin:         'wood',
  pool_party:    'grass',  // Ch9: grass footsteps, no procedural floor scatter
};

export const FOOTSTEP_URLS: Record<string, string[]> = {
  carpet:   [fc0, fc1, fc2],
  wood:     [fw0, fw1, fw2],
  concrete: [fn0, fn1, fn2],
  grass:    [fg0, fg1, fg2],
};

import typewriterUrl from '../assets/audio/kenney_interface-sounds/Audio/tick_002.ogg?url';

import uiClickUrl from '../assets/audio/kenney_interface-sounds/Audio/click_002.ogg?url';
import uiHoverUrl from '../assets/audio/kenney_interface-sounds/Audio/switch_004.ogg?url';
import uiPickUrl  from '../assets/audio/kenney_interface-sounds/Audio/drop_003.ogg?url';
import uiBackUrl  from '../assets/audio/kenney_interface-sounds/Audio/back_001.ogg?url';
import uiToggleUrl from '../assets/audio/kenney_interface-sounds/Audio/toggle_001.ogg?url';

export const UI_SELECT_URL   = uiSelectUrl;
export const VICTORY_JINGLE_URL = victoryUrl;
export const TYPEWRITER_URL  = typewriterUrl;

export const UI_CLICK_URL = uiClickUrl;
export const UI_HOVER_URL = uiHoverUrl;
export const UI_PICK_URL = uiPickUrl;
export const UI_BACK_URL = uiBackUrl;
export const UI_TOGGLE_URL = uiToggleUrl;

import crackUrl from '../assets/audio/kenney_impact-sounds/Audio/impactGlass_light_000.ogg?url';
import shatterUrl from '../assets/audio/kenney_impact-sounds/Audio/impactGlass_heavy_000.ogg?url';
export const UI_CRACK_URL = crackUrl;
export const UI_SHATTER_URL = shatterUrl;

// ── DIALOGUE TEXT (TASK-08) ──
import dialogBlipUrl from '../assets/audio/dialog_sound.mp3?url';
export const DIALOG_BLIP_URL = dialogBlipUrl;

// ── KNOCK (TASK-03) ──
// Light wood rap for the Ch6 door approach, played 3x in quick succession = knocking.
import knockUrl from '../assets/audio/kenney_impact-sounds/Audio/impactPlank_medium_001.ogg?url';
export const KNOCK_URL = knockUrl;

// ── DOOR OPEN ──
// Creaky door swing for the Ch6 "The door opens." story beat.
import doorOpenUrl from '../assets/audio/kenney_rpg-audio/Audio/doorOpen_1.ogg?url';
export const DOOR_OPEN_URL = doorOpenUrl;

// ── GAME-WIDE ONE-SHOTS (July 2026 SFX pass) ──
import handleCoinsUrl from '../assets/audio/kenney_rpg-audio/Audio/handleCoins.ogg?url';
import creakUrl from '../assets/audio/kenney_rpg-audio/Audio/creak1.ogg?url';
import doorCloseUrl from '../assets/audio/kenney_rpg-audio/Audio/doorClose_1.ogg?url';
import metalClickUrl from '../assets/audio/kenney_rpg-audio/Audio/metalClick.ogg?url';

export const SFX_LEDGER_URL = handleCoinsUrl;    // ledger beat auto-plays this
export const SFX_CREAK_URL = creakUrl;
export const SFX_DOOR_CLOSE_URL = doorCloseUrl;
export const SFX_METAL_CLICK_URL = metalClickUrl;
