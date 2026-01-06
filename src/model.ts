import * as z from 'zod';

export const Station = z.object({
  name: z.string(),
});
export type Station = z.infer<typeof Station>;

export const FontReference = z.object({
  family: z.string().optional().describe('Font family name'),
  url: z.string().startsWith('./').describe('Relative URL to font file'),
});
export type FontReference = z.infer<typeof FontReference>;

export const Line = z.object({
  system: z.string().optional(),
  font: z
    .union([
      z
        .string()
        .startsWith('google-fonts:', `Font references must start with 'google-fonts:'`)
        .transform((str) => {
          return {
            url: str,
          } as FontReference;
        })
        .describe('Google Fonts reference, starting with "google-fonts:"'),
      FontReference,
    ])
    .optional(),
  name: z.string(),
  color: z.string(),
  stations: z.array(Station),
});
export type Line = z.infer<typeof Line>;
