import { Container, Card, Text, Group, Stack } from '@mantine/core';
import { inProgressFeatures } from '@config/features';
import { SectionTitle } from './SectionTitle';

export function ComingSoon() {
  return (
    <Container size={'lg'} pt={'sm'} pb={'md'} px={0} mb={'calc(var(--mantine-spacing-xl) * 2)'}>
      <SectionTitle label={'Coming Soon'} id={'coming-soon-section'} />

      <Stack gap={'md'} align={'center'}>
        {inProgressFeatures.map((feature) => (
          <Card
            key={feature.label}
            shadow={'md'}
            radius={'md'}
            p={'lg'}
            style={{
              border: '1px solid var(--mantine-color-yellow-7)',
              maxWidth: 500,
              width: '100%',
            }}
          >
            <Group gap={'sm'}>
              <Text style={{ fontSize: '1.25rem', lineHeight: 1 }}>🚧</Text>
              <Text size={'lg'} fw={700}>
                {feature.label}
              </Text>
            </Group>
          </Card>
        ))}
      </Stack>
    </Container>
  );
}
