import { Secret } from '@shared/db/schema';
import { DeadropConfig } from '@shared/types/config';

type ConfigMessage =
  | {
      type: 'get_config';
      payload: undefined;
    }
  | {
      type: 'config' | 'set_config';
      payload: DeadropConfig;
    };

type VaultMessage =
  | {
      type: 'add_secret' | 'update_secret';
      payload: {
        name: string;
        value: string;
        environment: string;
      };
    }
  | {
      type: 'get_secret' | 'delete_secret';
      payload: {
        name: string;
        environment: string;
      };
    }
  | {
      type: 'get_secrets';
      payload: {
        environment: string;
      };
    }
  | {
      type: 'secret';
      payload: Secret;
    }
  | {
      type: 'all_secrets';
      payload: Secret[];
    };

export type DeadropMessage =
  | ConfigMessage
  | VaultMessage
  | {
      type: 'notification';
      payload: {
        variant: 'success' | 'error';
        message: string;
      };
    };

export type DeadropServiceWorkerMessage = Omit<
  ExtendableMessageEvent,
  'data'
> & {
  data: DeadropMessage;
};
