import { Group, Text, Badge } from '@mantine/core';

export type FeatureStatus = 'complete' | 'in-progress' | 'scheduled';

export interface FeatureRowProps {
  label: string;
  status: FeatureStatus;
  badge?: string;
}

const statusEmoji: Record<FeatureStatus, string> = {
  'complete': '✅',
  'in-progress': '🚧',
  'scheduled': '📋',
};

const statusLabelColor: Record<FeatureStatus, string> = {
  'complete': 'var(--mantine-color-white)',
  'in-progress': 'var(--mantine-color-yellow-4)',
  'scheduled': 'var(--mantine-color-dark-2)',
};

const statusBadgeColor: Record<FeatureStatus, string> = {
  'complete': 'teal',
  'in-progress': 'yellow',
  'scheduled': 'gray',
};

export function FeatureRow({ label, status, badge }: FeatureRowProps) {
  return (
    <Group
      gap={'xs'}
      py={4}
      px={'xs'}
      style={{
        borderRadius: 'var(--mantine-radius-sm)',
        transition: 'background-color 150ms ease',
      }}
    >
      <Text
        component={'span'}
        style={{
          flexShrink: 0,
          fontSize: '0.9rem',
          lineHeight: 1,
        }}
      >
        {statusEmoji[status]}
      </Text>

      <Text
        size={'md'}
        fw={status === 'complete' ? 500 : 400}
        style={{
          flex: 1,
          color: statusLabelColor[status],
        }}
      >
        {label}
      </Text>

      {badge && (
        <Badge
          size={'xs'}
          variant={'light'}
          color={statusBadgeColor[status]}
          style={{ flexShrink: 0 }}
        >
          {badge}
        </Badge>
      )}
    </Group>
  );
}
