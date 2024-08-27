export const encode = (input: string) => Buffer.from(input);

export const encodeJson = (input: Record<string, any>) => {
  const data = JSON.stringify(input);
  return encode(data);
};

export const decode = (input: ArrayBuffer) =>
  new TextDecoder().decode(input);
