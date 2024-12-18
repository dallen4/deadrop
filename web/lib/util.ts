import randomColor from 'randomcolor';
import { UAParser } from 'ua-parser-js';
import { generateGrabUrl as baseGenerateGrabUrl } from '@shared/lib/util';

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
    const url = window.location.protocol + window.location.host;

    return baseGenerateGrabUrl(url, id);
};

export const getBrowserInfo = () => new UAParser().getResult();
