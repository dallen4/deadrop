import React from 'react';
import { HOME_PATH } from '@config/paths';
import { Box, Text, clsx, createStyles } from '@mantine/core';
import Link from 'next/link';
import Image from 'next/image';
import { useMediaQuery } from '@mantine/hooks';

const useStyles = createStyles((theme) => ({
    linkContainer: {
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    headerName: {
        ...theme.headings.sizes.h1,
        fontWeight: 'bold',
        float: 'left',
        marginLeft: '7px',
        ':hover': {
            color: theme.colors[theme.primaryColor][4],
        },
    },
    hoverPointer: {
        ':hover': {
            cursor: 'pointer',
        },
    },
}));

const Brand = () => {
    const { classes } = useStyles();
    const renderLogo = useMediaQuery('(min-width: 490px)');

    return (
        <Link href={HOME_PATH}>
            <Box className={classes.linkContainer}>
                {renderLogo && (
                    <Image
                        src={'/icons/android-chrome-192x192.png'}
                        height={54}
                        width={54}
                        className={classes.hoverPointer}
                    />
                )}
                <Text
                    className={clsx(classes.headerName, classes.hoverPointer)}
                >
                    deadrop
                </Text>
            </Box>
        </Link>
    );
};

export default Brand;
