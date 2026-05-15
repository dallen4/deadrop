import React, { RefObject, useRef } from 'react';
import {
  Button,
  Card,
  Container,
  Text,
  TextInput,
} from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { GRAB_PATH } from '@shared/config/paths';
import classes from './GrabSection.module.css';

export function GrabSection() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const submitGrab = () => {
    const inputVal = inputRef.current?.value;
    if (!inputVal) return;

    const isUrl = inputVal.includes(
      window.location.protocol + window.location.host,
    );

    const params = isUrl
      ? inputVal.split('?')[1]
      : new URLSearchParams({ drop: inputVal }).toString();

    router.push(`${GRAB_PATH}?${params}`);
  };

  return (
    <Container size='lg' className={classes.wrapper}>
      <Card
        id='start-grab-section'
        withBorder
        shadow='md'
        radius='md'
        padding='xl'
        className={classes.card}
      >
        <div className={classes.inner}>
          <div className={classes.iconWrap}>
            <IconDownload size={28} stroke={1.75} />
          </div>
          <div>
            <Text className={classes.heading}>Grab a Secret</Text>
            <Text size='sm' c='dimmed' mt={4}>
              Got a drop ID or link? Drop it in and we'll get you your
              secret.
            </Text>
          </div>
        </div>

        <div className={classes.form}>
          <TextInput
            ref={inputRef as RefObject<HTMLInputElement>}
            className={classes.input}
            size='md'
            variant='filled'
            placeholder='sUp3Rs3c3R+'
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitGrab();
            }}
          />
          <Button size='md' onClick={submitGrab}>
            Start
          </Button>
        </div>
      </Card>
    </Container>
  );
}
