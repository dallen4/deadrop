import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { describe, expect, it } from 'vitest';
import { SharePane } from 'molecules/SharePane';

const renderWithMantine = (ui: React.ReactElement) =>
    render(<MantineProvider>{ui}</MantineProvider>);

describe('SharePane', () => {
    it('shows an accepting badge with the confirmed count', () => {
        renderWithMantine(
            <SharePane
                link={'https://deadrop.io/grab/abc'}
                accepting
                confirmedCount={2}
            />,
        );

        expect(
            screen.getByText('Accepting (2 confirmed)'),
        ).toBeInTheDocument();
    });

    it('shows a not-accepting badge once accepting stops', () => {
        renderWithMantine(
            <SharePane
                link={'https://deadrop.io/grab/abc'}
                accepting={false}
                confirmedCount={1}
            />,
        );

        expect(
            screen.getByText('Not accepting (1 confirmed)'),
        ).toBeInTheDocument();
    });

    it('hides the max-grabbers cap badge for non-experimental users', () => {
        renderWithMantine(
            <SharePane
                link={'https://deadrop.io/grab/abc'}
                accepting
                confirmedCount={0}
                maxGrabbers={1}
                experimental={false}
            />,
        );

        expect(screen.queryByText('Cap: 1')).not.toBeInTheDocument();
    });

    it('shows the max-grabbers cap badge for experimental users', () => {
        renderWithMantine(
            <SharePane
                link={'https://deadrop.io/grab/abc'}
                accepting
                confirmedCount={0}
                maxGrabbers={5}
                experimental
            />,
        );

        expect(screen.getByText('Cap: 5')).toBeInTheDocument();
    });

    it('shows an unbounded cap badge when maxGrabbers is null', () => {
        renderWithMantine(
            <SharePane
                link={'https://deadrop.io/grab/abc'}
                accepting
                confirmedCount={0}
                maxGrabbers={null}
                experimental
            />,
        );

        expect(screen.getByText('Unbounded cap')).toBeInTheDocument();
    });
});
