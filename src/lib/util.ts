import randomColor from 'randomcolor';
import { toDataURL } from 'qrcode';
import { randomBytes } from 'crypto';
import { DROP_PATH } from './constants';

export const bufferFromString = (input: string) => {
    const size = input.length;

    const buffer = new ArrayBuffer(size);
    const viewArray = new Uint8Array(buffer);

    for (let i = 0; i < size; i++) viewArray[i] = input.charCodeAt(i);

    return viewArray;
};

// ref: https://github.com/davidmerfield/randomColor#options
const hues = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'monochrome'];

export const generateColorSet = (amount: number = 2) => {
    const colors = new Array<string>(amount);

    for (let cIndex = 0; cIndex < amount; cIndex++) {
        const hue = hues[Math.floor(Math.random() * hues.length)];

        colors[cIndex] = randomColor({ hue, luminosity: 'bright' });
    }

    return colors;
};

export const generateGrabUrl = (id: string) => {
    const params = new URLSearchParams({ drop: id });
    const baseUrl = new URL(DROP_PATH, window.location.host);

    return `${baseUrl.toString()}?${params.toString()}`;
};

export const generateQrCodeUrl = (input: string) => toDataURL(input);

export const generateDropKey = (id: string) => `drop:${id}`;

export const generateIV = () => randomBytes(12).toString('binary');

export const getIVBuffer = (iv: string) => Buffer.from(iv, 'binary');
