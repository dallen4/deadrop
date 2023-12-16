import { bufferFromString } from './util';

export const encode = (input: string) => bufferFromString(input);

export const encodeJson = (input: Record<string, any>) => {
  const data = JSON.stringify(input);
  return encode(data);
};

export const decode = (input: ArrayBuffer) => new TextDecoder().decode(input);
