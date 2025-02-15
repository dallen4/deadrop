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

export const bufferFromBase64 = (input: string): ArrayBuffer => {
  const binaryString =
    typeof atob === 'function'
      ? atob(input)
      : Buffer.from(input, 'base64').toString('binary');

  const buffer = new Uint8Array(
    [...binaryString].map((char) => char.charCodeAt(0)),
  );
  return buffer.buffer;
};

export const base64FromBuffer = (buffer: ArrayBuffer): string => {
  const view = new Uint8Array(buffer);
  const binaryString = String.fromCharCode(...view);

  return typeof btoa === 'function'
    ? btoa(binaryString)
    : Buffer.from(binaryString, 'binary').toString('base64');
};
