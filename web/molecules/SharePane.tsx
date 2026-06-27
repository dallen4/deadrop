import React from 'react';
import {
    Stack,
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
        <Stack align={'center'} gap={'sm'}>
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
            <Text size={'sm'} c={'dimmed'}>
                Invite a friend with a scan
            </Text>
            <Box
                p={'xs'}
                style={{
                    border: `2px solid ${theme.colors.blue[6]}`,
                    borderRadius: theme.radius.md,
                }}
            >
                <Box
                    p={4}
                    style={{
                        borderRadius: theme.radius.sm,
                        backgroundColor: theme.white,
                    }}
                >
                    <QRCode link={link} />
                </Box>
            </Box>
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
        </Stack>
    );
};
