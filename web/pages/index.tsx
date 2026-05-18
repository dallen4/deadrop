import React from 'react';
import { Button, Center } from '@mantine/core';
import { OVERVIEW_DOCS_PATH } from '@shared/config/paths';
import { HeroBanner } from 'molecules/HeroBanner';
import { Faq, Features, PricingTeaser } from 'molecules/sections';
import { GrabSection } from 'molecules/sections/GrabSection';
import { Tools } from 'molecules/sections/Tools';
import { useRouter } from 'next/router';
import classes from './index.module.css';

const Home = () => {
  const router = useRouter();

  return (
    <>
      <HeroBanner />
      <Features />
      <GrabSection />
      <Tools />
      <PricingTeaser />
      <Faq />
      <Center pb="xl">
        <Button
          className={classes.control}
          size={'lg'}
          onClick={() => router.push(OVERVIEW_DOCS_PATH)}
        >
          Check out the Docs
        </Button>
      </Center>
    </>
  );
};

export default Home;
