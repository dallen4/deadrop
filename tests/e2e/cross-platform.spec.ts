import { expect, test } from 'vitest';
import { ActorKind, dropActors, grabActors, roundTrip } from './harness';

const secret = 'cross-platform e2e secret';

// 4-way matrix: cli→cli, cli→web, web→cli, web→web
for (const dropKind of [ActorKind.Cli, ActorKind.Web]) {
  for (const grabKind of [ActorKind.Cli, ActorKind.Web]) {
    test(`${dropKind} drop → ${grabKind} grab`, async () => {
      await roundTrip(dropActors[dropKind], grabActors[grabKind], secret);
    });
  }
}
