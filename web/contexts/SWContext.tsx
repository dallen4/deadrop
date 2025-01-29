import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { showNotification } from '@mantine/notifications';
import { DeadropMessage } from 'types/worker';

type MessageHandler = (msg: DeadropMessage) => void;

type ServiceWorkerCtx = {
  activateWorker: () => Promise<void>;
  workerController: ServiceWorker | null;
  sendMessage: MessageHandler;
  addMessageHandler: (handler: MessageHandler) => void;
  removeMessageHandler: (handler: MessageHandler) => void;
};

const SWContext = createContext<ServiceWorkerCtx>(
  {} as ServiceWorkerCtx,
);

export const useSWContext = () => useContext(SWContext);

export const SWProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  // SW controller instance
  const [workerController, setWorkerController] =
    useState<ServiceWorker | null>(null);

  /**
   * set of handlers to run on each message
   * useRef b/c don't need re-renders
   */
  const messageHandlers = useRef(new Set<MessageHandler>());

  useEffect(() => {
    const updateController = () => {
      setWorkerController(navigator.serviceWorker.controller);
    };

    // Set initial controller if available
    updateController();

    // whenever SW indicates a change in controller, hydrate
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      updateController,
    );

    /**
     * loop over all mounted handlers
     * this allows you to mount message handlers lower in the tree
     * @param event deadrop SW meessage
     */
    const messageCallback = (event: MessageEvent<DeadropMessage>) => {
      messageHandlers.current.forEach((handler) =>
        handler(event.data),
      );
    };

    navigator.serviceWorker.addEventListener(
      'message',
      messageCallback,
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        updateController,
      );

      navigator.serviceWorker.removeEventListener(
        'message',
        messageCallback,
      );

      messageHandlers.current.clear();
    };
  }, []);

  const addMessageHandler = useCallback((handler: MessageHandler) => {
    messageHandlers.current.add(handler);
  }, []);

  const removeMessageHandler = useCallback(
    (handler: MessageHandler) => {
      messageHandlers.current.delete(handler);
    },
    [],
  );

  useEffect(() => {
    const notificationHandler = (message: DeadropMessage) => {
      if (message.type === 'notification') {
        const { message: msg, variant } = message.payload;

        showNotification({
          message: msg,
          color: variant === 'error' ? 'red' : undefined,
        });
      }
    };

    addMessageHandler(notificationHandler);

    return () => removeMessageHandler(notificationHandler);
  }, [addMessageHandler, removeMessageHandler]);

  const activateServiceWorker = async () => {
    if (
      'serviceWorker' in navigator &&
      window.workbox !== undefined &&
      !workerController
    ) {
      await window.workbox.register();
    }
  };

  const sendMessage = useCallback((message: DeadropMessage) => {
    if (!workerController) {
      console.error('No active Service Worker controller found.');
      return;
    }

    workerController.postMessage(message);
  }, []);

  return (
    <SWContext.Provider
      value={{
        activateWorker: activateServiceWorker,
        workerController,
        sendMessage,
        addMessageHandler,
        removeMessageHandler,
      }}
    >
      {children}
    </SWContext.Provider>
  );
};
