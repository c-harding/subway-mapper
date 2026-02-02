import * as z from 'zod';
import { Padding } from '../geometry/Padding.ts'; // This file is used by Node, so must use .ts extension

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
