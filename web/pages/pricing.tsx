import React from 'react';
import { Alert, Container } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { useRouter } from 'next/router';
import { PricingSection } from 'molecules/sections/PricingSection';

const PricingPage = () => {
  const router = useRouter();
  const purchased = router.query.status === 'success';

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
