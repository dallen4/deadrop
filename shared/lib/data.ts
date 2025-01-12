export const encode = (input: string) =>
  new TextEncoder().encode(input);

export const encodeJson = (input: Record<string, any>) => {
  const data = JSON.stringify(input);
  return encode(data);
};

export const decode = (input: AllowSharedBufferSource) =>
  new TextDecoder().decode(input);

export const decodeJsonBuffer = (
  value: AllowSharedBufferSource,
): Record<string, any> => {
  const stringifiedJson = decode(value);
  return JSON.parse(stringifiedJson);
};

export const bufferFromBase64 = (input: string) => {
  const binary = Buffer.from(input, 'base64');
  return new Uint8Array(binary).buffer;
};

export const base64FromBuffer = (buffer: ArrayBuffer) => {
  const binary = new Uint8Array(buffer);
  return Buffer.from(binary).toString('base64');
};
