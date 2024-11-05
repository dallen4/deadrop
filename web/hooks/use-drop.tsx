import type { DropContext } from '@shared/types/drop';
import { useEffect, useMemo, useRef } from 'react';
import { useMachine } from '@xstate/react';
import { dropMachine, initDropContext } from '@shared/lib/machines/drop';
import { DropState } from '@shared/lib/constants';
import { generateGrabUrl } from 'lib/util';
import { encryptFile, hashFile } from 'lib/crypto';
import { showNotification } from '@mantine/notifications';
import { IconX } from '@tabler/icons';
import { initPeer } from 'lib/peer';
import { createDropHandlers } from '@shared/handlers/drop';
import { cleanupSession } from 'lib/session';
import { useRouter } from 'next/router';

export const useDrop = () => {
    const router = useRouter();

    const logsRef = useRef<Array<string>>([]);
    const contextRef = useRef<DropContext>(initDropContext());

    const [{ value: state }, send] = useMachine(dropMachine);

    const pushLog = (message: string) => logsRef.current.push(message);

    useEffect(() => {
        const onLeaveAttempt = () => {
            throw 'Cannot navigate away, peer active';
        };

        if (state === DropState.Ready) {
            router.events.on('routeChangeStart', onLeaveAttempt);
        } else if (
            [DropState.Completed, DropState.Error].includes(state as DropState)
        ) {
            router.events.off('routeChangeStart', onLeaveAttempt);
        }

        return () => {
            router.events.off('routeChangeStart', onLeaveAttempt);
        };
    }, [state]);

    const onRetryExceeded = () => {
        showNotification({
            message: 'Connection may be unstable, please try again',
            color: 'red',
            icon: <IconX />,
            autoClose: 4500,
        });
    };

    const {
        init: initDrop,
        stagePayload,
        startHandshake,
        drop,
    } = useMemo(
        () =>
            createDropHandlers({
                ctx: contextRef.current,
                sendEvent: send,
                logger: {
                    info: pushLog,
                    error: console.error,
                    debug: console.log,
                },
                file: {
                    encrypt: encryptFile,
                    hash: hashFile,
                },
                cleanupSession,
                // apiUri: process.env.NEXT_PUBLIC_DEADROP_API_URL || '',
                initPeer,
                onRetryExceeded,
            }),
        [],
    );

    const init = async () => {
        try {
            await initDrop();
        } catch (err) {
            console.error(err);
            showNotification({
                message: (err as Error).message,
                color: 'red',
                icon: <IconX />,
                autoClose: 2000,
            });
        }
    };

    const dropLink = () => {
        const dropId = contextRef.current.id!;
        return typeof window !== 'undefined'
            ? generateGrabUrl(dropId)
            : undefined;
    };

    const getLogs = () => logsRef.current;

    return {
        init,
        setPayload: stagePayload,
        dropLink,
        startHandshake,
        drop,
        getLogs,
        status: state as DropState,
    };
};
