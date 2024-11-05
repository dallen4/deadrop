import { useMantineTheme } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks/lib/use-media-query/use-media-query';

export const useMobile = () => {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(
    `(max-width: ${theme.breakpoints.sm}px)`,
  );

  return isMobile;
};
