import React, { useEffect } from 'react';
import { Alert, Container } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { PricingSection } from 'molecules/sections/PricingSection';
import { usePricingTiersActive } from '@config/flags';

const PricingPage = () => {
  const router = useRouter();
  const pricingActive = usePricingTiersActive();
  const purchased = router.query.status === 'success';

  useEffect(() => {
    if (!pricingActive) router.replace('/');
  }, [pricingActive, router]);

  if (!pricingActive) return null;

  return (
    <>
      {purchased && (
        <Container size="lg" mt="md">
          <Alert
            icon={<IconCheck size={18} />}
            color="green"
            title="Welcome, supporter!"
            variant="light"
          >
            Your purchase was successful. Your plan will activate momentarily.
          </Alert>
        </Container>
      )}
      <PricingSection />
    </>
  );
};

export default PricingPage;
