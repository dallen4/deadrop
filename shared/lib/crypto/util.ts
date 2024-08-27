import { decode } from '../data';

export const decodeJsonBuffer = (value: ArrayBuffer) => {
  const stringifiedJson = decode(value);
  return JSON.parse(stringifiedJson);
};
