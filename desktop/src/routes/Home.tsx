import React from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/react';
import {
  Badge,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconArrowUpRight,
  IconDownload,
  IconLock,
} from '@tabler/icons-react';
import { MainWrapper } from '@shared/components';

// Desktop home is a hub/dashboard for engaged users — quick actions +
// account/vault status, not a marketing landing page.
const ActionCard = ({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <Card
    component={Link}
    to={to}
    withBorder
    padding={'lg'}
    radius={'md'}
    style={{ height: '100%' }}
  >
    <Group gap={'sm'} mb={'xs'}>
      {icon}
      <Text fw={600}>{title}</Text>
    </Group>
    <Text size={'sm'} c={'dimmed'}>
      {description}
    </Text>
  </Card>
);

export const HomePage = () => {
  const { user } = useUser();

  const greeting = user?.firstName
    ? `Welcome back, ${user.firstName}`
    : 'Welcome back';

  return (
    <MainWrapper>
      <Stack gap={'xl'} w={'100%'}>
        <Title order={2}>{greeting}</Title>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={'md'}>
          <ActionCard
            to={'/drop'}
            icon={<IconArrowUpRight size={20} />}
            title={'Drop a secret'}
            description={
              'Start an encrypted peer-to-peer transfer and share the link.'
            }
          />
          <ActionCard
            to={'/grab'}
            icon={<IconDownload size={20} />}
            title={'Grab a secret'}
            description={
              'Paste a drop link or id to receive a secret securely.'
            }
          />
        </SimpleGrid>

        <Card withBorder padding={'lg'} radius={'md'}>
          <Group justify={'space-between'} align={'flex-start'}>
            <Group gap={'sm'}>
              <IconLock size={20} />
              <div>
                <Text fw={600}>Vaults</Text>
                <Text size={'sm'} c={'dimmed'}>
                  Store and sync your secrets across devices.
                </Text>
              </div>
            </Group>
            <Badge variant={'light'} color={'gray'}>
              Coming soon
            </Badge>
          </Group>
        </Card>
      </Stack>
    </MainWrapper>
  );
};
