import * as z from 'zod';

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

export const Line = z
  .object({
    name: z.string(),
    color: z.string(),
    overlayColor: z.string().optional(),
    lineType: z.string().optional(),
    stations: z.array(RawStation).transform((stations) =>
      stations.map<Station>((station, i) => ({
        ...station,
        terminus: i === 0 || i === stations.length - 1,
      })),
    ),
  })
  .meta({ id: 'Line' });
export type Line = z.infer<typeof Line>;

export const Padding = z
  .union([
    z.number().transform((p) => ({ top: p, bottom: p, left: p, right: p })),
    z.record(z.enum(['x', 'y', 'top', 'bottom', 'left', 'right']), z.number()).transform((obj) => ({
      top: obj.top ?? obj.y ?? 0,
      bottom: obj.bottom ?? obj.y ?? 0,
      left: obj.left ?? obj.x ?? 0,
      right: obj.right ?? obj.x ?? 0,
    })),
  ])
  .meta({ id: 'Padding' });
export type Padding = z.infer<typeof Padding>;

export const LineType = z
  .object({
    shape: z.enum(['oval', 'rectangle', 'pill']).optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    padding: Padding.optional(),
    font: FontNameOrReference.optional(),
    fontWeight: z.number().optional(),
    fontSize: z.number().optional(),
    baseLineShift: z.number().optional(),
  })
  .meta({ id: 'LineType' });
export type LineType = z.infer<typeof LineType>;

export const Network = z
  .object({
    name: z.string().optional(),
    font: FontNameOrReference.optional(),
    lines: z.array(Line),
    lineTypes: z.record(z.string(), LineType).optional(),
    hyphenation: z
      .array(z.string())
      .transform((arr) => new Map(arr.map((item) => [item.replaceAll('~', ''), item])))
      .optional(),
  })
  .meta({ id: 'Network' });
export type Network = z.infer<typeof Network>;
