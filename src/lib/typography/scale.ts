/**
 * TEXT_SIZE - Unified typographic scale for the Lead Manager UI
 * 7-step typographic scale with 1.25× ratio (87.5% scale)
 * All text should import and use these tokens instead of inline text-* values
 * Line-height is intentionally omitted here and set per-usage for vertical rhythm control
 */

export const TEXT_SIZE = {
  /** 10px - captions, meta information, small annotations */
  XS: 'text-xs',
  /** 12px - body text small, labels, secondary text */
  SM: 'text-sm',
  /** 14px - default body text, paragraphs */
  BASE: 'text-base',
  /** 16px - section headers, prominent labels */
  LG: 'text-lg',
  /** 18px - section titles, important text */
  XL: 'text-xl',
  /** 20px - key metrics, prominent numbers */
  XL2: 'text-2xl',
  /** 24px - section titles, large headings */
  XL3: 'text-3xl',
  /** 30px - major section titles */
  XL4: 'text-4xl',
} as const;

export type TextSizeKey = keyof typeof TEXT_SIZE;

/** Default line-height ratios per text size for proper vertical rhythm */
export const TEXT_LINE_HEIGHT = {
  XS: '0.875',    /* 12px / 14px */
  SM: '1',        /* 14px / 14px */
  BASE: '1.5',    /* 16px / 16px - standard body */
  LG: '1.375',    /* 18px / 16px */
  XL: '1.375',    /* 20px / 16px */
  XL2: '1.25',    /* 24px / 20px */
  XL3: '1.2',     /* 30px / 25px (approximate) */
  XL4: '1.15',    /* 36px / 31px (approximate) */
} as const;

/** Font-weight recommendations per text size */
export const TEXT_FONT_WEIGHT = {
  XS: 'semibold',   /* 600 */
  SM: 'medium',     /* 500 */
  BASE: 'normal',   /* 400 */
  LG: 'semibold',   /* 600 */
  XL: 'semibold',   /* 600 */
  XL2: 'bold',      /* 700 */
  XL3: 'extrabold', /* 800 */
  XL4: 'black',     /* 900 */
} as const;