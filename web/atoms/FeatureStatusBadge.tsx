import React from 'react';
import { Badge } from '@mantine/core';

export type FeatureStatus =
  | 'stable'
  | 'experimental'
  | 'in development';

const statusToColor: Record<FeatureStatus, string> = {
  stable: 'blue',
  experimental: 'indigo',
  'in development': 'yellow',
};

export const FeatureStatusBadge = ({
  status,
}: {
  status: keyof typeof statusToColor;
}) => {
  return (
    <Badge
      size={'lg'}
      color={statusToColor[status as keyof typeof statusToColor]}
    >
      {status}
    </Badge>
  );
};
