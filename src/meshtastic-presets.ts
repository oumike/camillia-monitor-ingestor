export const MESHTASTIC_PRESET_NAMES = [
  'LongFast',
  'LongMod',
  'LongSlow',
  'LongTurbo',
  'MediumFast',
  'MediumSlow',
  'ShortFast',
  'ShortSlow',
  'ShortTurbo',
] as const;

export type MeshtasticPresetName = (typeof MESHTASTIC_PRESET_NAMES)[number];