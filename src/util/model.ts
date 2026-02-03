import type { ZodType } from 'zod';

export function zNullToOptional<T extends ZodType>(schema: T) {
  return schema.nullable().transform((val) => val ?? undefined);
}
