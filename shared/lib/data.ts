export const encode = (input: string) => Buffer.from(input);

export const encodeJson = (input: Record<string, any>) => {
  const data = JSON.stringify(input);
  return encode(data);
};

export const decode = (input: ArrayBuffer) =>
  new TextDecoder().decode(input);

export const bufferFromBase64 = (input: string) => {
  const binary = Buffer.from(input, 'base64');
  return new Uint8Array(binary).buffer;
};

export const base64FromBuffer = (buffer: ArrayBuffer) => {
  const binary = new Uint8Array(buffer);
  return Buffer.from(binary).toString('base64');
};
