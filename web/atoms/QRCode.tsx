import React, { useEffect, useState } from 'react';
import { Image } from '@mantine/core';
import { generateQR } from 'lib/qrcode';

export const QRCode = ({ link }: { link: string | undefined }) => {
    const [src, setSrc] = useState<string>();

    useEffect(() => {
        link && generateQR(link).then(setSrc);
    }, [link]);

    return (
        <Image
            radius={'sm'}
            src={src}
            w={200}
            h={200}
            fit={'contain'}
            style={{ flexShrink: 0 }}
        />
    );
};
