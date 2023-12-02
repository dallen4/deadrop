import React from 'react';
import GrabFlow from 'organisms/GrabFlow';
import { Container } from '@mantine/core';

const Grab = () => {
    return (
        <Container style={{ maxWidth: '700px' }} p={0}>
            <GrabFlow />
        </Container>
    );
};

export default Grab;
