import * as z from 'zod';

export const StationObject = z.object({
  name: z.string(),
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

export const FontNameOrReference = z.union([
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
]);
export type FontNameOrReference = z.infer<typeof FontNameOrReference>;

export const Line = z.object({
  system: z.string().optional().describe('The name of the transit system'),
  font: FontNameOrReference.optional(),
  name: z.string(),
  color: z.string(),
  stations: z.array(RawStation).transform((stations) =>
    stations.map<Station>((station, i) => ({
      ...station,
      terminus: i === 0 || i === stations.length - 1,
    })),
  ),
});
export type Line = z.infer<typeof Line>;
