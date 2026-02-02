import * as z from 'zod';

import { Padding } from '../geometry/Padding.ts'; // This file is used by Node, so must use .ts extension
import { Spacing } from '../geometry/Spacing.ts'; // This file is used by Node, so must use .ts extension
import { RawPadding, RawSpacing } from './geometry.ts'; // This file is used by Node, so must use .ts extension

export const PartialLayoutConfig = z
  .object({
    padding: RawPadding.optional().describe('Padding around the map'),
    spacing: z
      .object({
        marker: RawSpacing.optional().describe('Spacing around markers'),
        label: RawSpacing.optional().describe('Spacing around labels'),
      })
      .optional()
      .describe('Spacing settings'),
    gap: z
      .object({
        markerLabel: RawSpacing.optional().describe('Gap between markers and labels'),
      })
      .optional()
      .describe('Gap settings'),
    lineWidth: z.number().min(0).optional().describe('Width of the lines'),
    curve: z

      .union([
        z.object({ radius: z.number().min(0).describe('Radius of curves') }),
        z.object({
          curvature: z
            .number()
            .min(0)
            .describe('Curvature of curves (distance from angled point to start of curve'),
        }),
      ])
      .refine((curve) => 'curvature' in curve || 'radius' in curve)
      .optional()
      .describe('Curve settings'),
    marker: z
      .object({
        radius: z.number().min(0).optional().describe('Radius of markers'),
        strokeWidth: z.number().min(0).optional().describe('Stroke width of markers'),
      })
      .optional()
      .describe('Marker settings'),
    label: z
      .object({
        fontSize: z.number().min(1).optional().describe('Font size for labels'),
        fontWeight: z.number().min(100).max(900).optional().describe('Font weight for labels'),
        lineHeight: z.number().optional().optional().describe('Line height for multi-line labels'),
      })
      .optional()
      .describe('Label settings'),
  })
  .meta({ id: 'LayoutConfig' });

export type PartialLayoutConfig = z.infer<typeof PartialLayoutConfig>;

export type LayoutConfig = {
  padding: Padding;
  spacing: {
    marker: Spacing;
    label: Spacing;
  };
  gap: {
    markerLabel: Spacing;
  };
  lineWidth: number;
  curve: { radius: number } | { curvature: number };
  marker: {
    radius: number;
    strokeWidth: number;
  };
  label: {
    fontSize: number;
    fontWeight: number;
    lineHeight?: number;
  };
};

export const defaultLayoutConfig: LayoutConfig = {
  padding: new Padding(0),
  spacing: {
    marker: new Spacing(0),
    label: new Spacing(0),
  },
  gap: {
    markerLabel: new Spacing(0),
  },
  lineWidth: 10,
  curve: { radius: 50 },
  marker: {
    radius: 6,
    strokeWidth: 3,
  },
  label: {
    fontSize: 30,
    fontWeight: 600,
  },
};

export function mergeLayoutConfig(
  partialConfig: PartialLayoutConfig,
  otherConfig: PartialLayoutConfig,
): PartialLayoutConfig {
  return {
    padding: partialConfig.padding ?? otherConfig.padding,
    spacing: {
      marker: partialConfig.spacing?.marker ?? otherConfig.spacing?.marker,
      label: partialConfig.spacing?.label ?? otherConfig.spacing?.label,
    },
    gap: {
      markerLabel: partialConfig.gap?.markerLabel ?? otherConfig.gap?.markerLabel,
    },
    lineWidth: partialConfig.lineWidth ?? otherConfig.lineWidth,
    curve: partialConfig.curve ?? otherConfig.curve,
    marker: {
      radius: partialConfig.marker?.radius ?? otherConfig.marker?.radius,
      strokeWidth: partialConfig.marker?.strokeWidth ?? otherConfig.marker?.strokeWidth,
    },
    label: {
      fontSize: partialConfig.label?.fontSize ?? otherConfig.label?.fontSize,
      fontWeight: partialConfig.label?.fontWeight ?? otherConfig.label?.fontWeight,
      lineHeight: partialConfig.label?.lineHeight ?? otherConfig.label?.lineHeight,
    },
  };
}

export function completeLayoutConfig(partialConfig: PartialLayoutConfig): LayoutConfig {
  return mergeLayoutConfig(partialConfig, defaultLayoutConfig) as LayoutConfig;
}
