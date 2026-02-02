import * as z from 'zod';

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
