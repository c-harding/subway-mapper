import axios from 'axios';
import { Network, NetworkDisplay } from './model';

export async function loadNetwork(network: string, map?: string): Promise<Network> {
  const [networkData, mapData] = await Promise.all([
    axios.get(network).then((res) => Network.parse(res.data)),
    map !== undefined ? axios.get(map).then((res) => NetworkDisplay.parse(res.data)) : undefined,
  ]);

  return merge(networkData, mapData);
}

function merge(network: Network, mapData?: NetworkDisplay): Network {
  if (!mapData) return network;

  return {
    ...network,
    font: mapData.font ?? network.font,
    lines: network.lines.map((line) => {
      const mapLine = mapData.lines.find((l) => l.name === line.name);
      return {
        ...line,
        ...mapLine,
      };
    }),
    lineTypes: {
      ...network.lineTypes,
      ...mapData.lineTypes,
    },
  };
}
