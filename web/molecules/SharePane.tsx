import React from 'react';
import {
    Box,
    Text,
    CopyButton,
    Button,
    Badge,
    Group,
    useMantineTheme,
    Anchor,
} from '@mantine/core';
import { IconCopy } from '@tabler/icons-react';
import { QRCode } from 'atoms/QRCode';

export type SharePaneProps = {
    link: string;
    accepting?: boolean;
    confirmedCount?: number;
    maxGrabbers?: number | null;
    experimental?: boolean;
};

export const SharePane = ({
    link,
    accepting,
    confirmedCount = 0,
    maxGrabbers,
    experimental,
}: SharePaneProps) => {
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
            {accepting !== undefined && (
                <Group gap={'xs'}>
                    <Badge color={accepting ? 'green' : 'gray'}>
                        {accepting
                            ? `Accepting (${confirmedCount} confirmed)`
                            : `Not accepting (${confirmedCount} confirmed)`}
                    </Badge>
                    {experimental && (
                        <Badge variant={'outline'} color={'blue'}>
                            {maxGrabbers == null
                                ? 'Unbounded cap'
                                : `Cap: ${maxGrabbers}`}
                        </Badge>
                    )}
                </Group>
            )}
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
                                <IconCopy
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
