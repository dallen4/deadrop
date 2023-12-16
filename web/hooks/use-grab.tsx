import { grabMachine, initGrabContext } from '@shared/lib/machines/grab';
import { useMachine } from '@xstate/react/lib/useMachine';
import type { GrabContext } from '@shared/types/grab';
import { GrabState } from '@shared/lib/constants';
import { useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { decryptFile, hashFile } from '@shared/lib/crypto/browser';
import { showNotification } from '@mantine/notifications';
import { IconX } from '@tabler/icons';
import { createGrabHandlers } from '@shared/handlers/grab';
import { cleanupSession } from 'lib/session';
import { initPeer } from 'lib/peer';

export const useGrab = () => {
    const router = useRouter();

    const logsRef = useRef<Array<string>>([]);
    const contextRef = useRef<GrabContext>(initGrabContext());

    const [{ value: state }, send] = useMachine(grabMachine);

    const pushLog = (message: string) => logsRef.current.push(message);

    const onRetryExceeded = () => {
        showNotification({
            message: 'Connection may be unstable, please try again',
            color: 'red',
            icon: <IconX />,
            autoClose: 4500,
        });
    };

    const { init: baseInit } = useMemo(
        () =>
            createGrabHandlers<File>({
                ctx: contextRef.current,
                sendEvent: send,
                logger: {
                    info: pushLog,
                    error: console.error,
                    debug: console.log,
                },
                file: {
                    decrypt: decryptFile,
                    hash: hashFile,
                },
                initPeer,
                cleanupSession,
                onRetryExceeded,
            }),
        [],
    );

    const getLogs = () => logsRef.current;

    const getMode = () => contextRef.current.mode;

    const getSecret = () => contextRef.current.message;

    const init = async () => {
        contextRef.current.id = router.query.drop as string;

        await baseInit();
    };

    return {
        init,
        status: state as GrabState,
        getLogs,
        getMode,
        getSecret,
    };
};
