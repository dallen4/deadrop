export const KEY_FMT = 'jwk';

export const HASH_ALGO = 'SHA-256';

export const ENCRYPTION_ALGO = 'AES-GCM';

export const DERIVED_KEY_PARAMS: AesDerivedKeyParams = {
  name: ENCRYPTION_ALGO,
  length: 256,
};

export const KEY_PAIR_PARAMS: EcKeyGenParams & EcKeyImportParams = {
  name: 'ECDH',
  namedCurve: 'P-384',
};
