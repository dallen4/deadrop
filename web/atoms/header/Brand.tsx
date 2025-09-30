import React from 'react';
import { HOME_PATH } from '@shared/config/paths';
import { Box, Title } from '@mantine/core';
import clsx from 'clsx';
import Link from 'next/link';
import Image from 'next/image';
import { useMediaQuery } from '@mantine/hooks';

import classes from './Brand.module.css';

const Brand = () => {
  const renderBrandName = useMediaQuery('(min-width: 505px)');

  return (
    <Link href={HOME_PATH} style={{ textDecoration: 'none' }}>
      <Box className={classes.linkContainer}>
        <Image
          src={'/icons/handshake-transparent.svg'}
          alt={'deadrop icon'}
          height={60}
          width={60}
          className={classes.hoverPointer}
        />
        {renderBrandName && (
          <Title
            ml={8}
            className={clsx(
              classes.headerName,
              classes.hoverPointer,
            )}
          >
            deadrop
          </Title>
        )}
      </Box>
    </Link>
  );
};

export default Brand;
