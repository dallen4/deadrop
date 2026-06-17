import { CliProcess } from '../../utils/cli-process'; // ported from cli/tests/e2e/util.ts
import {
  apiURL,
  dropTimeout,
  grabTimeout,
  testToken,
} from '../../utils/config';
import { ActorKind } from './types';
import type { DropActor, GrabActor } from './types';

// The dropper rides the stable test token past captcha/rate-limits. logic/drop.ts
// reads TEST_TOKEN and sends it as the cookie. PEER_SERVER_URL is baked into the
// CLI build; TURN_* are inherited from process.env (CI env / tests/.env).
const cliEnv = (): NodeJS.ProcessEnv => ({
  DEADROP_API_URL: apiURL,
  TEST_TOKEN: testToken(),
});

export const cliDropActor = (): DropActor => {
  let proc: CliProcess | null = null;
  return {
    kind: ActorKind.Cli,
    async drop(secret) {
      proc = new CliProcess(['drop', secret], cliEnv());
      const m = await proc.waitFor(/grab\?drop=([^\s&]+)/, dropTimeout);
      return { id: m[1], link: m[0] };
    },
    async dispose() {
      proc?.kill();
    },
  };
};

export const cliGrabActor = (): GrabActor => {
  let proc: CliProcess | null = null;
  return {
    kind: ActorKind.Cli,
    async grab(id) {
      proc = new CliProcess(['grab', id], { DEADROP_API_URL: apiURL });
      // grab handler logs: "Message validated!\n\nSecret: <value>"
      const m = await proc.waitFor(/Secret:\s*(.+)/, grabTimeout);
      return m[1].trim();
    },
    async dispose() {
      proc?.kill();
    },
  };
};
