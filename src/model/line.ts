import * as z from 'zod';
import { RawStation, type Station } from './station.ts'; // This file is used by Node, so must use .ts extension

const RawLineDisplay = z
  .object({
    /** The ID of the line to apply these display settings to */
    id: z
      .string()
      .nonempty()
      .optional()
      .describe('The ID of the line to apply these display settings to'),

    /** The name of the line to apply these display settings to */
    name: z
      .string()
      .nonempty()
      .optional()
      .describe(
        'The name of the line to apply these display settings to. If an ID is also provided, this field overrides the user-visible name of the line.',
      ),

    /** The color of the line */
    color: z.string().optional(),

    /** The overlay color of the line, used in the line’s number symbol */
    overlayColor: z.string().optional(),

    /** The type of the line, used to select line symbols */
    lineType: z.string().optional(),
  })
  .meta({ id: 'RawLineDisplay' });

export const LineDisplay = RawLineDisplay.refine((data) => data.id || data.name, {
  message: 'At least one of id or name must be specified',
}).meta({ id: 'LineDisplay' });
export type LineDisplay = z.infer<typeof LineDisplay>;

const RawLine = RawLineDisplay.extend({
  /** The ID of the line */
  id: z
    .string()
    .nonempty()
    .optional()
    .describe('The ID of the line. If not provided, the name is used instead.'),

  /** Name of the line, as displayed to users. */
  name: z
    .string()
    .nonempty()
    .describe('Name of the line. This doubles as the unique identifier if id is not provided.'),

  /** Stations on the line */
  stations: z.array(RawStation).transform<readonly Station[]>((stations) =>
    stations.map<Station>((station, i) => ({
      ...station,
      terminus: i === 0 || i === stations.length - 1,
    })),
  ),
}).describe('All the stations along a line');

export type RawLine = z.infer<typeof RawLine>;

class LineImpl {
  readonly id: string;
  readonly name: string;

  readonly stations: readonly Station[];

  readonly color?: string;
  readonly overlayColor?: string;
  readonly lineType?: string;

  constructor(rawLine: z.infer<typeof RawLine>) {
    this.id = rawLine.id ?? rawLine.name;
    this.name = rawLine.name;

    this.stations = rawLine.stations;

    this.color = rawLine.color;
    this.overlayColor = rawLine.overlayColor;
    this.lineType = rawLine.lineType;
  }

  override(data: z.infer<typeof RawLineDisplay>): LineImpl {
    return new LineImpl({
      id: this.id,
      name: data.name ?? this.name,
      stations: this.stations,
      color: data.color ?? this.color,
      overlayColor: data.overlayColor ?? this.overlayColor,
      lineType: data.lineType ?? this.lineType,
    });
  }

  getTermini(): Station[] {
    return this.stations.filter((station) => station.terminus);
  }

  getStation(name: string): Station | undefined {
    return this.stations.find((station) => station.name === name);
  }

  getNeighbouringStations(stationName: string): Set<string> {
    const index = this.stations.findIndex((station) => station.name === stationName);
    return new Set(
      [...[this.stations[index - 1]?.name], ...[this.stations[index + 1]?.name]].filter(
        (station) => station !== undefined,
      ),
    );
  }
}

export const Line = RawLine.transform((line) => new LineImpl(line))
  .describe('All the stations along a line')
  .meta({ id: 'Line' });
export type Line = z.infer<typeof Line>;
