/* eslint-disable @typescript-eslint/no-explicit-any */
import { useLogger, handlerOptions } from './util';
import { StateMachine } from 'xstate';
import { useMemo } from 'react';
import { useMachine } from '@xstate/react';
import { DropEvent } from '@shared/types/drop';
import { GrabEvent } from '@shared/types/grab';
import { DropEventType, GrabEventType } from '@shared/lib/constants';
import { BaseContext } from '@shared/types/common';

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
  TContext extends BaseContext,
  TEvent extends GlobalEvent,
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
  THandlers extends HandlerResult,
  TContext extends BaseContext,
  TEvent extends GlobalEvent,
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
