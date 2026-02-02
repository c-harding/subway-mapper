import * as z from 'zod';

import { Padding } from '../geometry/Padding.ts'; // This file is used by Node, so must use .ts extension
import { Spacing } from '../geometry/Spacing.ts'; // This file is used by Node, so must use .ts extension

export const RawPadding = z
  .union([
    z.number().transform((p) => new Padding(p)),
    z.record(z.enum(['x', 'y', 'top', 'bottom', 'left', 'right']), z.number()).transform(
      (obj) =>
        new Padding({
          top: obj.top ?? obj.y ?? 0,
          bottom: obj.bottom ?? obj.y ?? 0,
          left: obj.left ?? obj.x ?? 0,
          right: obj.right ?? obj.x ?? 0,
        }),
    ),
  ])
  .meta({ id: 'Padding' });

export const RawSpacing = z
  .union([
    z
      .number()
      .transform((s) => new Spacing(s))
      .describe('Uniform spacing in all directions'),
    z
      .record(z.enum(['x', 'y']), z.number())
      .transform((obj) => new Spacing({ x: obj.x, y: obj.y }))
      .describe('Spacing in x and y directions'),
  ])
  .meta({ id: 'Spacing' });
