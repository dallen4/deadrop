export const bufferFromString = (input: string) => {
    const size = input.length;

    const buffer = new ArrayBuffer(size);
    const viewArray = new Uint8Array(buffer);

    for (let i = 0; i < size; i++) viewArray[i] = input.charCodeAt(i);

    return viewArray;
};
