import type { Padding, Spacing } from './geometry';

export interface MapConfig {
  padding: Padding;
  spacing: {
    marker: Spacing;
    label: Spacing;
  };
  gap: {
    markerLabel: Spacing;
  };
  lineWidth: number;
  marker: {
    radius: number;
    strokeWidth: number;
  };
  label: {
    fontSize: number;
    fontWeight: number;
    lineHeight?: number;
  };
}
