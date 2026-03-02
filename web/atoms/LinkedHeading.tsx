import React from 'react';
import { Title, Anchor } from '@mantine/core';
import { IconLink } from '@tabler/icons-react';
import classes from './LinkedHeading.module.css';

const toSlug = (children: React.ReactNode): string => {
  const text = React.Children.toArray(children)
    .map((child) => (typeof child === 'string' ? child : ''))
    .join('');
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export function LinkedHeading({
  order,
  children,
  style,
}: {
  order: 1 | 2;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const id = toSlug(children);

  return (
    <Anchor href={`#${id}`} underline={'never'} c={'inherit'}>
      <Title
        id={id}
        order={order}
        className={classes.heading}
        style={style}
      >
        {children}
        <IconLink
          size={order === 1 ? 22 : 20}
          className={classes.icon}
        />
      </Title>
    </Anchor>
  );
}
