import * as z from 'zod';

import { FontNameOrReference } from './font.ts'; // This file is used by Node, so must use .ts extension
import { RawPadding } from './padding.ts'; // This file is used by Node, so must use .ts extension

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
