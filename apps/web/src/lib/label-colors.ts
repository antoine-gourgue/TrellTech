export type LabelColorKey =
  | 'indigo'
  | 'blue'
  | 'sky'
  | 'green'
  | 'lime'
  | 'yellow'
  | 'orange'
  | 'red'
  | 'pink'
  | 'purple'
  | 'gray';

type LabelColor = {
  key: LabelColorKey;
  label: string;
  solid: string;
  contrast: string;
};

const COLORS: Record<LabelColorKey, LabelColor> = {
  indigo: { key: 'indigo', label: 'Indigo', solid: '#5b5bd6', contrast: '#ffffff' },
  blue: { key: 'blue', label: 'Bleu', solid: '#3a6ad6', contrast: '#ffffff' },
  sky: { key: 'sky', label: 'Ciel', solid: '#3aa8e0', contrast: '#0e2230' },
  green: { key: 'green', label: 'Vert', solid: '#30a46c', contrast: '#ffffff' },
  lime: { key: 'lime', label: 'Citron', solid: '#7dbf3a', contrast: '#12240a' },
  yellow: { key: 'yellow', label: 'Jaune', solid: '#f5b544', contrast: '#3a2708' },
  orange: { key: 'orange', label: 'Orange', solid: '#e5811b', contrast: '#ffffff' },
  red: { key: 'red', label: 'Rouge', solid: '#e5484d', contrast: '#ffffff' },
  pink: { key: 'pink', label: 'Rose', solid: '#e0559e', contrast: '#ffffff' },
  purple: { key: 'purple', label: 'Violet', solid: '#8e4ec6', contrast: '#ffffff' },
  gray: { key: 'gray', label: 'Gris', solid: '#6b6b76', contrast: '#ffffff' },
};

export const LABEL_COLOR_KEYS = Object.keys(COLORS) as LabelColorKey[];

function fallback(color: string): LabelColor {
  let hash = 0;
  for (let i = 0; i < color.length; i += 1) {
    hash = (hash * 31 + color.charCodeAt(i)) >>> 0;
  }
  const key = LABEL_COLOR_KEYS[hash % LABEL_COLOR_KEYS.length] as LabelColorKey;
  return COLORS[key];
}

export function getLabelColor(color: string): LabelColor {
  const key = color.toLowerCase() as LabelColorKey;
  return COLORS[key] ?? fallback(color);
}
