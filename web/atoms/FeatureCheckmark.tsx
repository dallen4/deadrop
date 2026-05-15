import { Group, Text, Tooltip } from '@mantine/core';
import {
  IconCheck,
  IconMinus,
  IconLock,
} from '@tabler/icons-react';
import type { FeatureEntry } from '@shared/config/tiers';

type Props = Omit<FeatureEntry, 'included'> & {
  included: boolean | 'partial'
}

export function FeatureCheckmark({ label, included, tooltip }: Props) {
  const icon =
    included === true ? (
      <IconCheck size={16} color='var(--mantine-color-blue-6)' />
    ) : included === 'partial' ? (
      <IconLock size={16} color='var(--mantine-color-dimmed)' />
    ) : (
      <IconMinus size={16} color='var(--mantine-color-dimmed)' />
    )

  const content = (
    <Group gap={8} wrap='nowrap'>
      {icon}
      <Text
        size='sm'
        c={included ? undefined : 'dimmed'}
        style={{ lineHeight: 1.4 }}
      >
        {label}
      </Text>
    </Group>
  )

  if (tooltip) {
    return <Tooltip label={tooltip} withArrow>{content}</Tooltip>
  }

  return content
}
