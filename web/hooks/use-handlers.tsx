import { useLogger, useNavigationProtection } from './util';
import { handlerOptions } from './util';
import { StateValue } from 'xstate';
import { useMemo } from 'react';

type HandlerResult = {
  init: () => Promise<void>;
  stagePayload?: (content: string | File, mode: 'file' | 'raw') => Promise<void>;
  startHandshake?: () => Promise<void>;
  drop?: () => Promise<void>;
};

type NavigationProtection = {
  activateState: string;
  disabledStates: string[];
};

type CreateHandlersFn<
  TContext,
  TEvent,
  THandlers extends HandlerResult,
> = (
  options: {
    ctx: TContext;
    sendEvent: (event: TEvent) => void;
    logger: ReturnType<typeof useLogger>['logger'];
    apiUri: string;
  } & typeof handlerOptions,
) => THandlers;

export const useHandlers = <
  TContext,
  TEvent,
  THandlers extends HandlerResult,
>(
  createHandlers: CreateHandlersFn<TContext, TEvent, THandlers>,
  ctx: TContext,
  send: (event: TEvent) => void,
  state: StateValue,
  navigationProtection: NavigationProtection,
) => {
  const { logger, getLogs } = useLogger();

  const handlers =  useMemo(
    () =>
      createHandlers({
        ctx,
        sendEvent: send,
        logger,
        apiUri: process.env.NEXT_PUBLIC_DEADROP_API_URL!,
        ...handlerOptions,
      }),
    [],
  );

  useNavigationProtection(
    state,
    navigationProtection.activateState,
    navigationProtection.disabledStates
  );

  return {
    ...handlers,
    getLogs,
  };
};
