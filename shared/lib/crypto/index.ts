
type BaseCrypto = Omit<Crypto, 'webkitSubtle'>;

export const getCrypto = () => {
    if (typeof window !== 'undefined') {
        if (window.crypto.webkitSubtle)
            return {
                randomUUID: window.crypto.randomUUID,
                getRandomValues: window.crypto.getRandomValues,
                subtle: window.crypto.webkitSubtle!,
            } as BaseCrypto;
        else return window.crypto;
    } else return require('crypto').webcrypto as BaseCrypto;
};

export const getSubtle = () => getCrypto().subtle;
