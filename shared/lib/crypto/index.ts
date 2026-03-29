export type BaseCrypto = Omit<Crypto, 'webkitSubtle'>;

export const getCrypto = () => {
  if (typeof crypto !== 'undefined') return crypto;
  else if (
    typeof window !== 'undefined' &&
    Object.keys(window).length > 0
  ) {
    const wc = window.crypto as Crypto & { webkitSubtle?: SubtleCrypto };
    if (wc.webkitSubtle)
      return {
        randomUUID: window.crypto.randomUUID,
        getRandomValues: window.crypto.getRandomValues,
        subtle: wc.webkitSubtle,
      } as BaseCrypto;
    else return window.crypto;
  } else return require('crypto').webcrypto as BaseCrypto;
};

export const getSubtle = () => getCrypto().subtle;
