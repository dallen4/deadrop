import { Button, Title } from '@mantine/core';

import classes from './SectionTitle.module.css';
import { IconLink } from '@tabler/icons-react';

export function SectionTitle({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  return (
    <Title id={id} ta={'center'} className={classes.title}>
      {label}
    </Title>
  );
}

export function DocsSectionTitle({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  return (
    <Title order={2} id={id} className={classes.docsTitle}>
      {label}{' '}
      <Button className={classes.linkIcon} variant={'transparent'}>
        <IconLink />
      </Button>
    </Title>
  );
}
