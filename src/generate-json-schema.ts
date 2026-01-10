import * as z from 'zod';
import { Network } from './model.ts';

console.log(
  JSON.stringify(z.toJSONSchema(Network, { io: 'input', target: 'openapi-3.0' }), null, 2),
);
