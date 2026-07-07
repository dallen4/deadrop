import { cliDropActor, cliGrabActor } from './actors/cli';
import { webDropActor, webGrabActor } from './actors/web';
import { ActorKind } from './actors/types';
import type { DropActor, GrabActor } from './actors/types';

export { ActorKind };

export type ActorFactory<T> = () => T;

export const dropActors: Record<ActorKind, ActorFactory<DropActor>> = {
  [ActorKind.Cli]: cliDropActor,
  [ActorKind.Web]: webDropActor,
};

export const grabActors: Record<ActorKind, ActorFactory<GrabActor>> = {
  [ActorKind.Cli]: cliGrabActor,
  [ActorKind.Web]: webGrabActor,
};

/**
 * Runs a full drop→grab round-trip with the given actor factories and asserts
 * the grabbed secret matches the original. Handles dispose in a finally block
 * so dangling processes/browsers are cleaned up on failure too.
 */
export async function roundTrip(
  makeDrop: ActorFactory<DropActor>,
  makeGrab: ActorFactory<GrabActor>,
  secret: string,
): Promise<void> {
  const dropper = makeDrop();
  const grabber = makeGrab();
  try {
    const { id } = await dropper.drop(secret);
    const received = await grabber.grab(id);
    if (received !== secret) {
      throw new Error(
        `Secret mismatch: expected "${secret}", got "${received}"`,
      );
    }
  } finally {
    await Promise.allSettled([dropper.dispose(), grabber.dispose()]);
  }
}
