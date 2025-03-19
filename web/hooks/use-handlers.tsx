/* eslint-disable @typescript-eslint/no-explicit-any */
import { useLogger } from './util';
import { handlerOptions } from './util';
import { StateMachine } from 'xstate';
import { useMemo } from 'react';
import { useMachine } from '@xstate/react';
import { DropEvent } from '@shared/types/drop';
import { GrabEvent } from '@shared/types/grab';
import { DropEventType, GrabEventType } from '@shared/lib/constants';

type HandlerResult = {
  init: () => Promise<void>;
  stagePayload?: (
    content: string | File,
    mode: 'file' | 'raw',
  ) => Promise<void>;
  startHandshake?: () => Promise<void>;
  drop?: () => Promise<void>;
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

type GlobalEvent =
  | DropEvent<DropEventType>
  | GrabEvent<GrabEventType>;

export const useHandlers = <
  TContext,
  TEvent extends GlobalEvent,
  THandlers extends HandlerResult,
>(
  createHandlers: CreateHandlersFn<TContext, TEvent, THandlers>,
  machine: StateMachine<TContext, any, TEvent>,
  initContext: () => TContext,
) => {
  const { logger, getLogs } = useLogger();

  const [{ value: state, context }, send] = useMachine(machine, {
    context: initContext(),
    actions: {
      cleanup: (context, event) => {
        console.log('cleanup', context, event);
      },
    },
  });

  const handlers = useMemo(
    () =>
      createHandlers({
        ctx: context,
        sendEvent: send,
        logger,
        apiUri: process.env.NEXT_PUBLIC_DEADROP_API_URL!,
        ...handlerOptions,
      }),
    [],
  );

  return {
    ...handlers,
    getLogs,
    state,
    context,
  };
};
