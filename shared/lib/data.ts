
export const encode = (input: Record<string, any>) => {
    const data = JSON.stringify(input);
    return Buffer.from(data);
};

export const decode = (input: ArrayBuffer) => new TextDecoder().decode(input);
