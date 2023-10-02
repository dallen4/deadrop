import randomColor from 'randomcolor';
import { GRAB_PATH } from '@shared/config/paths';
import { UAParser } from 'ua-parser-js';

// ref: https://github.com/davidmerfield/randomColor#options
const hues = [
    'red',
    'orange',
    'yellow',
    'green',
    'blue',
    'purple',
    'pink',
    'monochrome',
];

export const generateColorSet = (amount = 2) => {
    const colors = new Array<string>(amount);

    for (let cIndex = 0; cIndex < amount; cIndex++) {
        const hue = hues[Math.floor(Math.random() * hues.length)];

        colors[cIndex] = randomColor({ hue, luminosity: 'bright' });
    }

    return colors;
};

export const generateGrabUrl = (id: string) => {
    const params = new URLSearchParams({ drop: id });
    const baseUrl = new URL(
        GRAB_PATH,
        window.location.protocol + window.location.host,
    );

    return `${baseUrl.toString()}?${params.toString()}`;
};

export const formatDropKey = (id: string) => `drop:${id}`;

export const getBrowserInfo = () => new UAParser().getResult();
