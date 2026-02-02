import * as z from 'zod';

export const StationObject = z.object({
  name: z.string(),
  lines: z.array(z.string()).optional(),
});
export type StationObject = z.infer<typeof StationObject>;

export const RawStation = z.union([
  StationObject,
  z.string().transform((str): StationObject => ({ name: str })),
]);
export type RawStation = z.infer<typeof RawStation>;

export type Station = RawStation & {
  terminus: boolean;
};

export interface StationData {
  name: string;
  lines: Set<string>;
  terminusLines: Set<string>;
  parallelLineGroups: Map<string, number>;
}
