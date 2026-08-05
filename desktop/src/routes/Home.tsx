import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/react';
import {
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
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
  color,
  title,
  description,
}: {
  to: string;
  icon: ReactNode;
  color: string;
  title: string;
  description: string;
}) => (
  <Card component={Link} to={to} withBorder padding={'lg'} radius={'md'}>
    <Stack gap={'sm'}>
      <ThemeIcon
        size={36}
        radius={'md'}
        variant={'light'}
        color={color}
      >
        {icon}
      </ThemeIcon>
      <div>
        <Text fw={600} mb={4}>
          {title}
        </Text>
        <Text size={'sm'} c={'dimmed'}>
          {description}
        </Text>
      </div>
    </Stack>
  </Card>
);

export const HomePage = () => {
  const { user } = useUser();

  const greeting = user?.firstName
    ? `Welcome back, ${user.firstName}`
    : 'Welcome back';

  return (
    <MainWrapper py={'xl'}>
      <Stack gap={'xl'} w={'100%'}>
        <div>
          <Title order={2} mb={4}>
            {greeting}
          </Title>
          <Text size={'sm'} c={'dimmed'}>
            Send and receive end-to-end encrypted secrets, peer to
            peer.
          </Text>
        </div>

        <Stack gap={'sm'}>
          <Text
            size={'xs'}
            fw={600}
            c={'dimmed'}
            tt={'uppercase'}
            style={{ letterSpacing: 0.4 }}
          >
            Quick actions
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={'md'}>
            <ActionCard
              to={'/drop'}
              icon={<IconArrowUpRight size={20} />}
              color={'blue'}
              title={'Drop a secret'}
              description={
                'Start an encrypted peer-to-peer transfer and share the link.'
              }
            />
            <ActionCard
              to={'/grab'}
              icon={<IconDownload size={20} />}
              color={'teal'}
              title={'Grab a secret'}
              description={
                'Paste a drop link or id to receive a secret securely.'
              }
            />
          </SimpleGrid>
        </Stack>

        <Stack gap={'sm'}>
          <Text
            size={'xs'}
            fw={600}
            c={'dimmed'}
            tt={'uppercase'}
            style={{ letterSpacing: 0.4 }}
          >
            Vaults
          </Text>
          <Card
            component={Link}
            to={'/vault'}
            withBorder
            padding={'lg'}
            radius={'md'}
          >
            <Group gap={'sm'}>
              <ThemeIcon
                size={36}
                radius={'md'}
                variant={'light'}
                color={'gray'}
              >
                <IconLock size={20} />
              </ThemeIcon>
              <div>
                <Text fw={600}>Store secrets in a vault</Text>
                <Text size={'sm'} c={'dimmed'}>
                  Manage secrets locally, with optional cloud sync.
                </Text>
              </div>
            </Group>
          </Card>
        </Stack>
      </Stack>
    </MainWrapper>
  );
};
