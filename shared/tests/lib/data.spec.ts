import {
  base64FromBuffer,
  bufferFromBase64,
  decode,
  decodeJsonBuffer,
  encode,
  encodeJson,
} from 'lib/data';
import { base64String } from 'tests/mocks/constants';
import { describe, expect, expectTypeOf, it } from 'vitest';

describe('data transform utilities', () => {
  it('should transform string to and from Uint8Array', () => {
    const input = 'sampleInput';

    const encodedInput = encode(input);

    expectTypeOf(encodedInput).toMatchTypeOf<Uint8Array>();
    expect(encodedInput instanceof Uint8Array).toBeTruthy();

    const decodedInput = decode(encodedInput);

    expect(decodedInput).toEqual(input);
  });

  it('should transform JSON to and from Uint8Array', () => {
    const input = { secret: 'superSecretConfig' };

    const encodedInput = encodeJson(input);

    expectTypeOf(encodedInput).toMatchTypeOf<Uint8Array>();
    expect(encodedInput instanceof Uint8Array).toBeTruthy();

    const decodedInput = decodeJsonBuffer(encodedInput);

    expect(decodedInput).toStrictEqual(input);
  });

  it('should transform base64 to and from ArrayBuffer', () => {
    const encodedInput = bufferFromBase64(base64String);

    expectTypeOf(encodedInput).toMatchTypeOf<ArrayBuffer>();
    expect(encodedInput instanceof ArrayBuffer).toBeTruthy();

    const decodedInput = base64FromBuffer(encodedInput);

    expect(decodedInput).toStrictEqual(base64String);
  });
});
