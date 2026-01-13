import * as z from 'zod';
import { Padding } from './geometry/Padding.ts'; // This file is used by Node, so must use .ts extension

export const StationObject = z.object({
  name: z.string(),
  lines: z.array(z.string()).optional(),
});
export type StationObject = z.infer<typeof StationObject>;

const RawStation = z.union([
  StationObject,
  z.string().transform((str): StationObject => ({ name: str })),
]);
type RawStation = z.infer<typeof RawStation>;

export type Station = RawStation & {
  terminus: boolean;
};

export const FontReference = z.object({
  family: z.string().optional().describe('Font family name'),
  url: z.string().startsWith('./').describe('Relative URL to font file'),
});
export type FontReference = z.infer<typeof FontReference>;

export const FontNameOrReference = z
  .union([
    z
      .string()
      .startsWith('google-fonts:', `Font references must start with 'google-fonts: or browser:'`)
      .transform((str) => {
        return {
          url: str,
        } as FontReference;
      })
      .describe('Google Fonts reference, starting with "google-fonts:"'),
    z
      .string()
      .startsWith('browser:', `Font references must start with 'google-fonts: or browser:'`)
      .transform((str) => {
        return {
          url: str,
        } as FontReference;
      })
      .describe('Browser font reference, starting with "browser:"'),
    FontReference,
  ])
  .meta({ id: 'FontNameOrReference' });
export type FontNameOrReference = z.infer<typeof FontNameOrReference>;

const RawLineDisplay = z
  .object({
    /** The ID of the line to apply these display settings to */
    id: z
      .string()
      .nonempty()
      .optional()
      .describe('The ID of the line to apply these display settings to'),

    /** The name of the line to apply these display settings to */
    name: z
      .string()
      .nonempty()
      .optional()
      .describe(
        'The name of the line to apply these display settings to. If an ID is also provided, this field overrides the user-visible name of the line.',
      ),

    /** The color of the line */
    color: z.string().optional(),

    /** The overlay color of the line, used in the line’s number symbol */
    overlayColor: z.string().optional(),

    /** The type of the line, used to select line symbols */
    lineType: z.string().optional(),
  })
  .meta({ id: 'RawLineDisplay' });

export const LineDisplay = RawLineDisplay.refine((data) => data.id || data.name, {
  message: 'At least one of id or name must be specified',
}).meta({ id: 'LineDisplay' });
export type LineDisplay = z.infer<typeof LineDisplay>;

export const Line = RawLineDisplay.extend({
  /** The ID of the line */
  id: z
    .string()
    .nonempty()
    .optional()
    .describe('The ID of the line. If not provided, the name is used instead.'),

  /** Name of the line, as displayed to users. */
  name: z
    .string()
    .nonempty()
    .describe('Name of the line. This doubles as the unique identifier if id is not provided.'),

  /** Stations on the line */
  stations: z.array(RawStation).transform((stations) =>
    stations.map<Station>((station, i) => ({
      ...station,
      terminus: i === 0 || i === stations.length - 1,
    })),
  ),
})
  .transform((line) => ({ ...line, id: line.id ?? line.name }))
  .describe('All the stations along a line')
  .meta({ id: 'Line' });
export type Line = z.infer<typeof Line>;

export const RawPadding = z
  .union([
    z.number().transform((p) => new Padding(p)),
    z.record(z.enum(['x', 'y', 'top', 'bottom', 'left', 'right']), z.number()).transform((obj) => ({
      top: obj.top ?? obj.y ?? 0,
      bottom: obj.bottom ?? obj.y ?? 0,
      left: obj.left ?? obj.x ?? 0,
      right: obj.right ?? obj.x ?? 0,
    })),
  ])
  .meta({ id: 'Padding' });

export const LineSymbol = z
  .object({
    /** The shape of the line’s number symbol */
    shape: z
      .enum(['oval', 'rectangle', 'pill'])
      .optional()
      .describe('The shape of the line’s number symbol'),

    /** The width of the line’s number symbol */
    width: z.number().optional().describe('The width of the line’s number symbol'),

    /** The height of the line’s number symbol */
    height: z.number().optional().describe('The height of the line’s number symbol'),

    /** Padding inside the line’s number symbol */
    padding: RawPadding.optional().describe('Padding inside the line’s number symbol'),

    /** Font for the line’s number symbol */
    font: FontNameOrReference.optional().describe('Font for the line’s number symbol'),

    fontWeight: z.number().optional(),

    fontSize: z.number().optional(),

    /** Vertical shift (positive is down) for the line’s number in the symbol */
    baseLineShift: z
      .number()
      .optional()
      .describe('Vertical shift (positive is down) for the line’s number in the symbol'),
  })
  .describe('Settings for a line’s number symbol')
  .meta({ id: 'LineSymbol' });
/** Settings for a line’s number symbol */
export type LineSymbol = z.infer<typeof LineSymbol>;

export const NetworkDisplay = z
  .object({
    /** Font for the network */
    font: FontNameOrReference.optional().describe('Font for the network'),

    /** Display settings for the lines in the network */
    lines: z
      .array(LineDisplay)
      .min(1)
      .optional()
      .describe('Display settings for the lines in the network'),

    /** A map of line types to their line symbols */
    lineSymbols: z
      .record(z.string(), LineSymbol)
      .optional()
      .describe('Map of line types to their line symbols'),
  })
  .meta({ id: 'NetworkDisplay' });
export type NetworkDisplay = z.infer<typeof NetworkDisplay>;

export const Network = NetworkDisplay.extend({
  /** Name of the network */
  name: z.string().optional().describe('Name of the network'),

  /** Lines in the network */
  lines: z.array(Line).min(1).describe('List of lines in the network'),

  /** A map of words to their hyphenated forms, using ~ to mark the hyphenation point(s) */
  hyphenation: z
    .array(z.string())
    .transform((arr) => new Map(arr.map((item) => [item.replaceAll('~', ''), item])))
    .optional()
    .describe('List of hyphenated words, with ~ marking the hyphenation point'),
}).meta({ id: 'Network' });
export type Network = z.infer<typeof Network>;
