import * as z from 'zod';

import { zNullToOptional } from '../util/model.ts'; // This file is used by Node, so must use .ts extension
import { skipUndefined } from '../util/undefined.ts'; // This file is used by Node, so must use .ts extension
import { allDirections, type Direction } from './direction.ts'; // This file is used by Node, so must use .ts extension
import { RawStation, type Station } from './station.ts'; // This file is used by Node, so must use .ts extension

export const DirectionSpec = z.object({
  /** The name of the first station in the segment */
  start: z.string().optional().describe('The name of the first station in the segment'),
  /** The name of the last station in the segment */
  end: z.string().optional().describe('The name of the last station in the segment'),
  /** The direction of the line segment */
  direction: z.enum(allDirections).describe('The direction of the line segment'),
});

export type DirectionSpec = z.infer<typeof DirectionSpec>;

export interface DirectionSegment {
  direction: Direction | undefined;
  stations: Station[];
}

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

    /** The directions of the segments of the line */
    directions: z.array(DirectionSpec).optional(),

    labelPositions: z
      .record(z.string(), zNullToOptional(z.enum(allDirections)))
      .optional()
      .transform((obj) => obj ?? {}),
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

  readonly directions?: DirectionSpec[];
  readonly directionSegments: readonly DirectionSegment[];

  readonly labelPositions: Partial<Record<string, Direction>>;

  constructor(rawLine: z.infer<typeof RawLine>) {
    this.id = rawLine.id ?? rawLine.name;
    this.name = rawLine.name;

    this.stations = rawLine.stations;

    this.color = rawLine.color;
    this.overlayColor = rawLine.overlayColor;
    this.lineType = rawLine.lineType;

    this.directions = rawLine.directions;

    this.directionSegments = LineImpl.splitIntoDirectionSegments(
      this.stations,
      this.directions ?? [],
      this.id,
    );

    this.labelPositions = rawLine.labelPositions;
  }

  override(data: z.infer<typeof RawLineDisplay>): LineImpl {
    return new LineImpl({
      ...this,
      ...skipUndefined(data),
      stations: this.stations,
      id: this.id,
      labelPositions: { ...this.labelPositions, ...data.labelPositions },
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

  static splitIntoDirectionSegments(
    stations: readonly Station[],
    directionSpecs: readonly DirectionSpec[],
    id: string,
  ) {
    const stationNames = new Set(stations.map((station) => station.name));
    for (const spec of directionSpecs) {
      if (spec.start && !stationNames.has(spec.start)) {
        console.warn(
          `Warning: Direction spec for line ${id} has a start station "${spec.start}" that does not exist on the line.`,
        );
        spec.start = undefined;
      }
      if (spec.end && !stationNames.has(spec.end)) {
        console.warn(
          `Warning: Direction spec for line ${id} has an end station "${spec.end}" that does not exist on the line.`,
        );
        spec.end = undefined;
      }
    }

    // The accumulated completed segments. Empty until a segment is completed.
    const segments: DirectionSegment[] = [];
    // The current segment being built, and its spec. Undefined after a segment is completed.
    let current: { segment: Station[]; spec: DirectionSpec | undefined } | undefined = undefined;
    let nextSpecIndex = 0;
    for (const station of stations) {
      // If we are not in a segment, start a new one.
      if (!current) {
        // Handle any intermediate segments that have no start or end (i.e., segment without any stations).
        let nextSpec = directionSpecs[nextSpecIndex];
        while (
          nextSpecIndex > 0 &&
          nextSpecIndex < directionSpecs.length - 1 &&
          nextSpec?.start === undefined &&
          nextSpec?.end === undefined
        ) {
          segments.push({ direction: nextSpec!.direction, stations: [] });
          nextSpecIndex++;
          nextSpec = directionSpecs[nextSpecIndex];
        }

        // If the spec matches this station, use it.
        if (nextSpec && (nextSpec.start === undefined || nextSpec.start === station.name)) {
          current = { segment: [station], spec: nextSpec };
          nextSpecIndex++;
        } else {
          current = { segment: [station], spec: undefined };
        }
      } else {
        // If the current segment has no spec, or no end, check if the next spec starts here.
        const nextSpecStart = directionSpecs[nextSpecIndex]?.start;
        if (!current.spec?.end && nextSpecStart && nextSpecStart === station.name) {
          // If we are in a segment without a spec, but the next spec starts here, complete the current segment and start a new one.
          segments.push({ direction: current.spec?.direction, stations: current.segment });
          current = { segment: [station], spec: directionSpecs[nextSpecIndex] };
          nextSpecIndex++;
        } else {
          // Otherwise, just add the station to the current segment.
          current.segment.push(station);
        }
      }

      // If the current spec ends at this station, complete the segment.
      if (current.spec && current.spec.end === station.name) {
        segments.push({ direction: current.spec.direction, stations: current.segment });
        current = undefined;
      }
    }
    if (current) {
      segments.push({ direction: current.spec?.direction, stations: current.segment });
    }

    if (nextSpecIndex < directionSpecs.length) {
      console.warn(
        `Warning: Not all direction specs were used for line ${id}.`,
        directionSpecs[nextSpecIndex],
        'was never reached.',
      );
    }

    return segments;
  }
}

export const Line = RawLine.transform((line) => new LineImpl(line))
  .describe('All the stations along a line')
  .meta({ id: 'Line' });
export type Line = z.infer<typeof Line>;
