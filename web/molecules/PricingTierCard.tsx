import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Switch,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { SignInButton, useUser } from '@clerk/nextjs';
import { CheckoutButton } from '@clerk/nextjs/experimental';
import { useRouter } from 'next/router';
import { FeatureCheckmark } from 'atoms/FeatureCheckmark';
import type { TierDef } from '@shared/config/tiers';
import { SupporterCheckoutModal } from './SupporterCheckoutModal';
import classes from './PricingTierCard.module.css';

const BADGE_LABELS: Record<NonNullable<TierDef['badge']>, string> = {
  founding: 'Founding',
  'most-popular': 'Most Popular',
  'best-value': 'Best Value',
};

type Props = TierDef & {
  compact?: boolean;
};

export function PricingTierCard({
  tierName,
  tagline,
  price,
  priceSubLabel,
  priceBadge,
  badge,
  highlighted,
  features,
  ctaLabel,
  ctaVariant,
  ctaType,
  ctaHref,
  compact,
}: Props) {
  const router = useRouter();
  const { user } = useUser();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [planPeriod, setPlanPeriod] = useState<'month' | 'annual'>(
    'month',
  );
  const displayFeatures = compact ? features.slice(0, 3) : features;
  const clerkPlanId = process.env.NEXT_PUBLIC_CLERK_PRO_PLAN_ID;

  const needsSignIn =
    (ctaType === 'external' || ctaType === 'clerk-checkout') && !user;

  const handleCta = () => {
    if (ctaType === 'router' && ctaHref) {
      router.push(ctaHref);
    } else if (ctaType === 'external') {
      setCheckoutOpen(true);
    } else if (ctaType === 'contact') {
      window.location.href = 'mailto:hello@deadrop.dev';
    }
  };

  return (
    <Card
      withBorder
      shadow="md"
      radius="md"
      padding="xl"
      className={highlighted ? classes.highlighted : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      <Stack gap="xs" style={{ flex: 1 }}>
        {badge && (
          <Badge
            variant="light"
            color="blue"
            size="sm"
            className={classes.badge}
          >
            {BADGE_LABELS[badge]}
          </Badge>
        )}

        <Group justify="space-between" align="center" wrap="nowrap">
          <Title order={3}>{tierName}</Title>
          {priceBadge && (
            <Badge variant="light" color="gray" size="sm">
              {priceBadge}
            </Badge>
          )}
        </Group>

        <Text size="sm" c="dimmed">
          {tagline}
        </Text>

        <Group
          justify="space-between"
          align="flex-start"
          wrap="nowrap"
          mt="xs"
        >
          <Stack gap={0}>
            <Text fw={700} className={classes.price}>
              {price}
            </Text>
            {priceSubLabel && (
              <Text size="xs" c="dimmed">
                {priceSubLabel}
              </Text>
            )}
          </Stack>
          {ctaType === 'clerk-checkout' && (
            <Switch
              size="sm"
              label="Annual"
              labelPosition="left"
              checked={planPeriod === 'annual'}
              onChange={(e) =>
                setPlanPeriod(
                  e.currentTarget.checked ? 'annual' : 'month',
                )
              }
            />
          )}
        </Group>

        <Divider my="sm" />

        <Stack gap={8}>
          {displayFeatures.map((f, i) => (
            <FeatureCheckmark key={i} {...f} />
          ))}
        </Stack>
      </Stack>

      {ctaType === 'clerk-checkout' && clerkPlanId && !needsSignIn ? (
        <CheckoutButton planId={clerkPlanId} planPeriod={planPeriod}>
          <Button variant={ctaVariant} fullWidth mt="xl">
            {ctaLabel}
          </Button>
        </CheckoutButton>
      ) : needsSignIn ? (
        <SignInButton mode="modal">
          <Button variant={ctaVariant} fullWidth mt="xl">
            {ctaLabel}
          </Button>
        </SignInButton>
      ) : (
        <Button
          variant={ctaVariant}
          fullWidth
          mt="xl"
          onClick={handleCta}
        >
          {ctaLabel}
        </Button>
      )}

      {ctaType === 'external' && (
        <SupporterCheckoutModal
          opened={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
        />
      )}
    </Card>
  );
}
