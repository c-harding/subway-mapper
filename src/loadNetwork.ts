import axios from 'axios';
import { Network } from './model';

export async function loadNetwork(url: string): Promise<Network> {
  return await axios.get(url).then((res) => Network.parse(res.data));
}
