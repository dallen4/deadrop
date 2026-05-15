import {
  Badge,
  Button,
  Card,
  Divider,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/router';
import { FeatureCheckmark } from 'atoms/FeatureCheckmark';
import { PRICING_PATH } from '@shared/config/paths';
import type { TierDef } from '@shared/config/tiers';
import classes from './PricingTierCard.module.css';

const BADGE_LABELS: Record<NonNullable<TierDef['badge']>, string> = {
  founding: 'Founding',
  'most-popular': 'Most Popular',
  'best-value': 'Best Value',
};

type Props = TierDef & {
  compact?: boolean;
  stripeLink?: string;
};

export function PricingTierCard({
  tierName,
  tagline,
  price,
  priceSubLabel,
  badge,
  highlighted,
  features,
  ctaLabel,
  ctaVariant,
  ctaType,
  ctaHref,
  planId,
  compact,
  stripeLink,
}: Props) {
  const router = useRouter();
  const { user } = useUser();
  const displayFeatures = compact ? features.slice(0, 3) : features;

  const handleCta = () => {
    if (ctaType === 'router' && ctaHref) {
      router.push(ctaHref);
    } else if (ctaType === 'external') {
      // Supporter checkout: must be signed in so we can attach userId for the webhook.
      if (!stripeLink || stripeLink === '#') return;
      if (!user) {
        router.push(`/sign-in?redirect_url=${encodeURIComponent(PRICING_PATH)}`);
        return;
      }
      const url = new URL(stripeLink);
      url.searchParams.set('client_reference_id', user.id);
      window.location.href = url.toString();
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
      style={{ display: 'flex', flexDirection: 'column' }}
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

        <Title order={3}>{tierName}</Title>

        <Text size="sm" c="dimmed">
          {tagline}
        </Text>

        <Text fw={700} size="xl" mt="xs">
          {price}
        </Text>
        {priceSubLabel && (
          <Text size="xs" c="dimmed" mt={-8}>
            {priceSubLabel}
          </Text>
        )}

        <Divider my="sm" />

        <Stack gap={8}>
          {displayFeatures.map((f, i) => (
            <FeatureCheckmark key={i} {...f} />
          ))}
        </Stack>
      </Stack>

      {ctaType === 'clerk-checkout' ? (
        // Placeholder — wire up <CheckoutButton> from @clerk/nextjs/experimental
        // once Clerk Billing is enabled in the dashboard
        <Button variant={ctaVariant} fullWidth mt="xl" disabled>
          {ctaLabel} (coming soon)
        </Button>
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
    </Card>
  );
}
