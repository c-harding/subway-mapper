import axios from 'axios';
import { Line } from './model';

export async function loadLine(url: string): Promise<Line> {
  const line = await axios.get(url).then((res) => Line.parse(res.data));
  return line;
}
