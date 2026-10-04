export const SCHEMA_VERSION = 11;
export const STORAGE_KEY = 'nqx.save';
export const LEGACY_KEYS = ['nqx-state','nqx_state','nqx.save.v9','nqx'];

export const TYPE_DEFS = [
  { id:'NQX', label:'NQX｜ノクス', rate:26, nature:'観測共鳴型', trace:1.15 },
  { id:'Q', label:'Q｜キュー', rate:22, nature:'適応侵食型' },
  { id:'ENQ', label:'ENQ｜エノ', rate:14, nature:'感応思念型' },
  { id:'ECHO', label:'ECHO｜エコー', rate:10, nature:'残響情報型' },
  { id:'VEIL', label:'VEIL｜ヴェイル', rate:8, nature:'境界位相型' },
  { id:'DRIFT', label:'DRIFT｜ドリフト', rate:7, nature:'漂流位相型' },
  { id:'SIGNAL', label:'SIGNAL｜シグナル', rate:6, nature:'同期情報型', trace:1.5 },
  { id:'FRAGMENT', label:'FRAGMENT｜フラグメント', rate:4, nature:'断片情報型' },
  { id:'REMNANT', label:'REMNANT｜レムナント', rate:3, nature:'残存情報型' }
];

export const TYPE_BY_ID = Object.fromEntries(TYPE_DEFS.map(x => [x.id, x]));
export const ABILITIES = ['LIFE','POWER','GUARD','SPEED','ABSORB','ADAPT'];
export const HIDDEN = ['POTENTIAL','DECAY','MUTATION','INSTINCT'];
export const EVOLUTION_AXES = ['侵食型','防壁型','統合型','漂流型','適応型','異常型'];
export const STATES = {
  stable:'STABLE', deprived:'INFORMATION DEPRIVED', excited:'EXCITED', tired:'TIRED', unstable:'UNSTABLE', terminal:'TERMINAL'
};
export const CLASS_LABELS = { aberrant:'ABERRANT', dominion:'DOMINION', unknown:'UNKNOWN' };

export const GROWTH_STAGE = growth => growth < 15 ? '卵' : growth < 40 ? '幼体' : growth < 75 ? '成体' : '成熟体';
export const PLAY_SIZE = growth => growth < 15 ? 10 : growth < 40 ? 15 : growth < 75 ? 20 : 25;

export const TRACE_PHASES = [
  { start:1, end:111, title:'観測対象' },
  { start:112, end:222, title:'個体という錯覚' },
  { start:223, end:333, title:'ECLYPSE' },
  { start:334, end:444, title:'HUMANITY' },
  { start:445, end:555, title:'反転観測' },
  { start:556, end:665, title:'ECLYPSEは何をしたのか' },
  { start:666, end:666, title:'ECLYPSE／最終観測記録' }
];

export const OBSERVATION_LIMITS = {
  externalCooldownMs: 30 * 60 * 1000,
  duplicateCodeMs: 24 * 60 * 60 * 1000,
  externalDailyMax: 6,
  signalMinGapMs: 30 * 60 * 1000,
  signalDailyMax: 3,
  signalWindowMs: 90 * 1000,
  cpuBattleCooldownMs: 30 * 60 * 1000,
  cpuRetreatCooldownMs: 10 * 60 * 1000,
  sleepMs: 60 * 60 * 1000
};

export const MONETIZATION = {
  free:'FREE',
  normalAdFree:'NORMAL_AD_FREE',
  fullAdFree:'FULL_AD_FREE',
  normalAdFreePriceJPY:250,
  fullAdFreePriceJPY:500,
  upgradePriceJPY:250
};

export const DEEP_RECORD_URL = '';
