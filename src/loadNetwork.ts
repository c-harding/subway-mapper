import axios from 'axios';
import { Network, NetworkDisplay } from './model';
import { definedFilter } from './util/undefined';

export async function loadNetwork(network: string, map?: string): Promise<Network> {
  return parseNetwork(
    axios.get(network).then((res) => res.data),
    map !== undefined ? axios.get(map).then((res) => res.data) : undefined,
  );
}

export async function parseNetwork(
  network: Promise<unknown>,
  map?: Promise<unknown>,
): Promise<Network> {
  const [networkData, mapData] = await Promise.all([
    network.then((res) => Network.parse(res)),
    map !== undefined ? map.then((res) => NetworkDisplay.parse(res)) : undefined,
  ]);

  return merge(networkData, mapData);
}

function merge(network: Network, mapData?: NetworkDisplay): Network {
  if (!mapData) return network;

  return {
    ...network,
    font: mapData.font ?? network.font,
    lines: network.lines
      .map((line) => {
        const mapLine = mapData.lines?.find((l) =>
          l.id ? l.id === line.id : l.name === line.name,
        );
        return mapLine ? line.override(mapLine) : line;
      })
      .filter(definedFilter),

    lineSymbols: {
      ...network.lineSymbols,
      ...mapData.lineSymbols,
    },
  };
}
