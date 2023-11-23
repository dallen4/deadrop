import React from 'react';
import { HOME_PATH } from '@shared/config/paths';
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
    logoSpacing: {
        marginLeft: '7px',
    },
    headerName: {
        ...theme.headings.sizes.h1,
        fontWeight: 'bold',
        float: 'left',
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
                <Image
                    src={'/icons/apple-touch-icon.png'}
                    height={60}
                    width={60}
                    className={classes.hoverPointer}
                />
                <Text
                    className={clsx(
                        classes.headerName,
                        classes.hoverPointer,
                        classes.logoSpacing,
                    )}
                >
                    deadrop
                </Text>
            </Box>
        </Link>
    );
};

export default Brand;
