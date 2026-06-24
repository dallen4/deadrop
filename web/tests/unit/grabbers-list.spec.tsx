import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { describe, expect, it } from 'vitest';
import { GrabberStatus } from '@shared/types/drop';
import type { GrabberRecord } from '@shared/types/drop';
import { GrabbersList } from 'molecules/GrabbersList';

const renderWithMantine = (ui: React.ReactElement) =>
    render(<MantineProvider>{ui}</MantineProvider>);

const makeGrabber = (
    peerId: string,
    status: GrabberStatus,
): GrabberRecord => ({
    peerId,
    connection: {} as GrabberRecord['connection'],
    dropKey: null,
    status,
    connectedAt: Date.now(),
    confirmedAt: null,
});

describe('GrabbersList', () => {
    it('shows a waiting message when there are no grabbers', () => {
        renderWithMantine(<GrabbersList grabbers={[]} />);

        expect(
            screen.getByText('Waiting for a grabber to connect...'),
        ).toBeInTheDocument();
    });

    it('renders one row per grabber with a status badge', () => {
        const grabbers = [
            makeGrabber('peer-a', GrabberStatus.Connected),
            makeGrabber('peer-b', GrabberStatus.Transferring),
            makeGrabber('peer-c', GrabberStatus.Confirmed),
            makeGrabber('peer-d', GrabberStatus.Failed),
        ];

        renderWithMantine(<GrabbersList grabbers={grabbers} />);

        expect(screen.getByText('peer-a')).toBeInTheDocument();
        expect(screen.getByText('Connected')).toBeInTheDocument();
        expect(screen.getByText('peer-b')).toBeInTheDocument();
        expect(screen.getByText('Transferring')).toBeInTheDocument();
        expect(screen.getByText('peer-c')).toBeInTheDocument();
        expect(screen.getByText('Confirmed')).toBeInTheDocument();
        expect(screen.getByText('peer-d')).toBeInTheDocument();
        expect(screen.getByText('Failed')).toBeInTheDocument();
    });
});
