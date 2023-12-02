import React, { useEffect, useState } from 'react';
import { Image } from '@mantine/core';
import { generateQR } from 'lib/qrcode';
import { useInterval } from '@mantine/hooks';
import classes from './DynamicQRCode.module.css';

export const QRCode = ({
    link,
    generateLink,
    dynamic,
}: {
    link?: string;
    generateLink?: () => Promise<string>;
    dynamic?: boolean;
}) => {
    const [src, setSrc] = useState<string>();

    const hydrateLink = async () => {
        const freshLink = link || (await generateLink!());
        const qrCodeSrc = await generateQR(freshLink);

        setSrc(qrCodeSrc);
    };

    const interval = useInterval(hydrateLink, 6_000);

    useEffect(() => {
        hydrateLink().then(() => dynamic && interval.start());

        return interval.stop;
    }, []);

    return (
        <div className={classes.container}>
            <Image
                key={src}
                radius={'sm'}
                src={src}
                width={200}
                height={200}
                className={dynamic ? classes.fade : undefined}
            />
        </div>
    );
};
