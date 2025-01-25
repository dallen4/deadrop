import React from 'react';
import { Center, Title, useMantineTheme } from '@mantine/core';
import { GetServerSideProps } from 'next/types';
import { validateCheckoutSession } from 'api/stripe';
import { MainWrapper } from 'atoms/MainWrapper';

const PremiumConfirmation = (props: { success: boolean }) => {
  const theme = useMantineTheme();
  return (
    <MainWrapper>
      <Center
        style={{
          minHeight: '230px',
          paddingTop: theme.spacing.xl,
          paddingBottom: theme.spacing.md,
        }}
      >
        <Title size={'h2'}>
          Premium{' '}
          {props.success ? 'Activated' : 'Subscription Failed'}!
        </Title>
      </Center>
    </MainWrapper>
  );
};

export const getServerSideProps: GetServerSideProps = async ({
  query,
  res,
}) => {
  res.setHeader('Cache-Control', 'private, maxage=600');

  const success = true;
  const checkoutSessionId = query.id;

  // if (checkoutSessionId && typeof checkoutSessionId === 'string') {
  //   const sessionPaid = await validateCheckoutSession(
  //     checkoutSessionId,
  //   );

  //   if (sessionPaid) success = true;
  // }

  return { props: { success } };
};

export default PremiumConfirmation;
