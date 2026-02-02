import * as z from 'zod';
import { setEquals } from '../util/set.ts'; // This file is used by Node, so must use .ts extension
import { PartialLayoutConfig } from './config.ts'; // This file is used by Node, so must use .ts extension
import { FontNameOrReference } from './font.ts'; // This file is used by Node, so must use .ts extension
import { LineSymbol } from './line-symbol.ts'; // This file is used by Node, so must use .ts extension
import { Line, LineDisplay } from './line.ts'; // This file is used by Node, so must use .ts extension

export const NetworkDisplay = z
  .object({
    /** Font for the network */
    font: FontNameOrReference.optional().describe('Font for the network'),

    /** Display settings for the lines in the network */
    lines: z
      .array(LineDisplay)
      .min(1)
      .optional()
      .describe('Display settings for the lines in the network'),

    /** A map of line types to their line symbols */
    lineSymbols: z
      .record(z.string(), LineSymbol)
      .optional()
      .describe('Map of line types to their line symbols'),

    /** Layout configuration for the network */
    layoutConfig: PartialLayoutConfig.optional().describe('Layout configuration for the network'),
  })
  .meta({ id: 'NetworkDisplay' });
export type NetworkDisplay = z.infer<typeof NetworkDisplay>;

interface StationData {
  name: string;
  lines: Set<string>;
  terminusLines: Set<string>;
  parallelLineGroups: Map<string, number>;
}

export const Network = NetworkDisplay.extend({
  /** Name of the network */
  name: z.string().optional().describe('Name of the network'),

  /** Lines in the network */
  lines: z.array(Line).min(1).describe('List of lines in the network'),

  /** A map of words to their hyphenated forms, using ~ to mark the hyphenation point(s) */
  hyphenation: z
    .array(z.string())
    .transform((arr) => new Map(arr.map((item) => [item.replaceAll('~', ''), item])))
    .optional()
    .describe('List of hyphenated words, with ~ marking the hyphenation point'),
})
  .transform((network) => {
    const stationDataWithoutParallels: Record<string, Omit<StationData, 'parallelLineGroups'>> = {};

    const lineMap = Object.fromEntries(network.lines.map((line) => [line.id, line]));

    for (const line of network.lines) {
      for (const station of line.stations) {
        const existing = stationDataWithoutParallels[station.name];
        const lines = new Set([...(existing?.lines ?? []), line.id]);
        stationDataWithoutParallels[station.name] = {
          name: station.name,
          lines,
          terminusLines: new Set([
            ...(existing?.terminusLines ?? []),
            ...(station.terminus ? [line.id] : []),
          ]),
        };
      }
    }

    const stationData: Record<string, StationData> = Object.fromEntries(
      Object.entries(stationDataWithoutParallels).map(([name, station]) => {
        const groups: { lines: string[]; neighbours: Set<string> }[] = [];
        for (const lineId of station.lines) {
          const neighbours = lineMap[lineId]!.getNeighbouringStations(name);
          const matchingGroup = groups.find((group) => setEquals(group.neighbours, neighbours));
          if (matchingGroup) {
            matchingGroup.lines.push(lineId);
          } else {
            groups.push({ lines: [lineId], neighbours });
          }
        }
        const parallelLineGroups = new Map<string, number>(
          groups.flatMap((group, i) => group.lines.map((lineId) => [lineId, i])),
        );

        return [name, { ...station, parallelLineGroups }];
      }),
    );

    return {
      ...network,
      stations: stationData,
    };
  })
  .meta({ id: 'Network' });
export type Network = z.infer<typeof Network>;
