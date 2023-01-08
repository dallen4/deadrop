
export const getCrypto = () => {
    if (typeof window !== 'undefined') {
        if (window.crypto.webkitSubtle)
            return {
                randomUUID: window.crypto.randomUUID,
                getRandomValues: window.crypto.getRandomValues,
                subtle: window.crypto.webkitSubtle!,
            } as Crypto;
        else return window.crypto;
    } else return require('crypto').webcrypto as Crypto;
};
