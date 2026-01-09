import * as z from 'zod';
import { Line } from './model.ts';

console.log(JSON.stringify(z.toJSONSchema(Line, { io: 'input', target: 'openapi-3.0' }), null, 2));
