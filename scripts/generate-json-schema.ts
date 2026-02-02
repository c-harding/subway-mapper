import * as fs from 'node:fs/promises';
import * as z from 'zod';
import { Network, NetworkDisplay } from '../src/model/index.ts';

await fs.writeFile(
  'public/networks-schema.json',

  JSON.stringify(z.toJSONSchema(Network, { io: 'input', target: 'openapi-3.0' }), null, 2),
  'utf-8',
);

await fs.writeFile(
  'public/maps-schema.json',
  JSON.stringify(z.toJSONSchema(NetworkDisplay, { io: 'input', target: 'openapi-3.0' }), null, 2),
  'utf-8',
);
