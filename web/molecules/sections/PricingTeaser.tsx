import React from 'react';
import { Button, Center, Container, SimpleGrid } from '@mantine/core';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { TIERS } from '@shared/config/tiers';
import { PRICING_PATH } from '@shared/config/paths';
import { PricingTierCard } from 'molecules/PricingTierCard';
import { SectionTitle } from './SectionTitle';
import classes from './PricingTeaser.module.css';

// Teaser shows Free, Supporter, Pro — Org is not the home-page audience
const TEASER_TIERS = TIERS.slice(0, 3);

export function PricingTeaser() {
  const router = useRouter();

  return (
    <Container size="lg" className={classes.wrapper}>
      <div className={classes.titleRow}>
        <SectionTitle label="Plans" id="pricing-teaser-section" />
        <Link href={PRICING_PATH} className={classes.seeAll}>
          See full comparison →
        </Link>
      </div>

      <SimpleGrid
        cols={{ base: 1, sm: 3 }}
        spacing={{ base: 'lg', md: 'xl' }}
      >
        {TEASER_TIERS.map((tier) => (
          <PricingTierCard
            key={tier.tierName}
            {...tier}
            compact
          />
        ))}
      </SimpleGrid>

      <Center mt="xl">
        <Button
          variant="outline"
          onClick={() => router.push(PRICING_PATH)}
        >
          Compare all plans, including Org
        </Button>
      </Center>
    </Container>
  );
}
