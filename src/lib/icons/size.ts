/**
 * ICON_SIZE - Unified icon size scale for the Lead Manager UI
 * 6-step typographic scale with 1.25× ratio
 * All components should import and use these tokens instead of inline w- h- values
 */

export const ICON_SIZE = {
  /** 14px - smallest icons, compact UI, metadata */
  XS: 'w-2.5 h-2.5',
  /** 16px - small icons, inline with text */
  SM: 'w-3 h-3',
  /** 20px - compact buttons, list items */
  MD: 'w-4 h-4',
  /** 24px - standard MetricCard, dashboard icons */
  LG: 'w-5 h-5',
  /** 28px - primary actions, accent areas */
  XL: 'w-6 h-6',
  /** 32px - navigation, large emphasis */
  XXL: 'w-8 h-8',
} as const;

export type IconSizeKey = keyof typeof ICON_SIZE;

/** Pre-computed CSS width/height values (1rem = 16px at default) */
export const ICON_DIMENSIONS = {
  XS: '7px',
  SM: '8px',
  MD: '12px',
  LG: '16px',
  XL: '20px',
  XXL: '28px',
} as const;