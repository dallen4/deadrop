import { Button, CopyButton, Title } from '@mantine/core';

import classes from './SectionTitle.module.css';
import { IconCheck, IconLink } from '@tabler/icons-react';

export function SectionTitle({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  return (
    <Title
      id={id}
      ta={'center'}
      mb={'calc(var(--mantine-spacing-xl) * 1.5)'}
    >
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
    <CopyButton
      value={
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}#${id}`
          : ''
      }
      timeout={2000}
    >
      {({ copied, copy }) => (
        <Title
          order={2}
          id={id}
          className={classes.docsTitle}
          onClick={copy}
        >
          {label}{' '}
          <Button
            className={classes.linkIcon}
            variant={'transparent'}
            aria-label={'Copy link to this section'}
          >
            {copied ? <IconCheck /> : <IconLink />}
          </Button>
        </Title>
      )}
    </CopyButton>
  );
}
