export async function asyncMap<A extends ArrayLike<unknown>, U>(
  arrayLike: A,
  callback: (item: A[number], index: number, array: A) => Promise<U>,
): Promise<U[]>;
export async function asyncMap<T, U>(
  iterable: Iterable<T> | ArrayLike<T>,
  callback: (item: T, index: number) => Promise<U>,
): Promise<U[]>;
export async function asyncMap<T, A extends ArrayLike<T> | Iterable<T>, U>(
  arrayLike: A,
  callback: (item: T, index: number, array: A) => Promise<U>,
): Promise<U[]> {
  return Promise.all(Array.from(arrayLike, (item, index) => callback(item, index, arrayLike)));
}

export async function asyncFlatMap<A extends ArrayLike<unknown>, U>(
  arrayLike: A,
  callback: (item: A[number], index: number, array: A) => Promise<U[]>,
): Promise<U[]>;
export async function asyncFlatMap<T, U>(
  iterable: Iterable<T> | ArrayLike<T>,
  callback: (item: T, index: number) => Promise<U[]>,
): Promise<U[]>;
export async function asyncFlatMap<T, A extends ArrayLike<T> | Iterable<T>, U>(
  arrayLike: A,
  callback: (item: T, index: number, array: A) => Promise<U[]>,
): Promise<U[]> {
  return (
    await Promise.all(Array.from(arrayLike, (item, index) => callback(item, index, arrayLike)))
  ).flat();
}
