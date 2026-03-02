import { Container, Title, Text, Card, Group, Stack, Divider } from '@mantine/core';
import { FeatureRow, type FeatureStatus } from 'atoms/FeatureRow';

export interface FeatureItem {
  label: string;
  status: FeatureStatus;
  badge?: string;
}

export interface FeatureGroup {
  title: string;
  emoji: string;
  features: FeatureItem[];
}

export interface FeaturesBreakdownProps {
  groups: FeatureGroup[];
}

function GroupCard({ title, emoji, features }: FeatureGroup) {
  return (
    <Card
      padding={'sm'}
      radius={'md'}
      style={{
        backgroundColor: 'var(--mantine-color-dark-6)',
        border: '1px solid var(--mantine-color-dark-4)',
      }}
    >
      <Group gap={'xs'} mb={'xs'}>
        <Text style={{ fontSize: '1rem', lineHeight: 1 }}>{emoji}</Text>
        <Title order={5} style={{ color: 'var(--mantine-color-white)' }}>
          {title}
        </Title>
      </Group>

      <Divider
        color={'dark.4'}
        mb={'xs'}
      />

      <Stack gap={0}>
        {features.map((feature) => (
          <FeatureRow key={feature.label} {...feature} />
        ))}
      </Stack>
    </Card>
  );
}

export function FeaturesBreakdown({ groups }: FeaturesBreakdownProps) {
  return (
    <Container size={'sm'} py={'md'}>
      <Stack gap={'sm'}>
        {groups.map((group) => (
          <GroupCard key={group.title} {...group} />
        ))}
      </Stack>
    </Container>
  );
}
