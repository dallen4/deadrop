import React from 'react';
import {
    Box,
    Text,
    CopyButton,
    Button,
    useMantineTheme,
    Anchor,
} from '@mantine/core';
import { Copy } from 'react-feather';
import { QRCode } from 'atoms/QRCode';

export const SharePane = ({ link }: { link: string }) => {
    const theme = useMantineTheme();

    return (
        <Box
            style={{
                width: '100%',
                height: '300px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}
        >
            <Text size={'sm'}>Invite a friend with a scan</Text>
            <QRCode link={link} />
            <Text size={'sm'}>
                or copy the{' '}
                <Anchor
                    id={'drop-link'}
                    inherit
                    inline
                    href={link}
                    target={'_blank'}
                >
                    link
                </Anchor>{' '}
                below
            </Text>
            <CopyButton value={link}>
                {({ copied, copy }) => (
                    <Button
                        color={copied ? 'cyan' : 'blue'}
                        size={'sm'}
                        onClick={copy}
                    >
                        {copied ? (
                            'Link Copied!'
                        ) : (
                            <>
                                Click to Copy{' '}
                                <Copy
                                    size={18}
                                    style={{ marginLeft: theme.spacing.xs }}
                                />
                            </>
                        )}
                    </Button>
                )}
            </CopyButton>
        </Box>
    );
};
