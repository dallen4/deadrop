import {
  IceServerConfiguration,
  IceServerCredentials,
} from '@shared/types/peer';
import { post } from '@shared/lib/fetch';

type GenereateTurnCredentialsInput = {
  turnKeyId: string;
  turnKeyApiToken: string;
  ttl?: number;
};

type TurnCredentialsResponse = {
  iceServers: IceServerConfiguration;
};

const DEFAULT_CREDS_TTL = 86400;

const buildTurnUrl = (apiId: string) =>
  `https://rtc.live.cloudflare.com/v1/turn/keys/${apiId}/credentials/generate-ice-servers`;

export async function generateTurnCredentials({
  turnKeyId,
  turnKeyApiToken,
  ttl = DEFAULT_CREDS_TTL,
}: GenereateTurnCredentialsInput): Promise<IceServerCredentials> {
  const url = buildTurnUrl(turnKeyId);

  const credentialsResponse = await post<
    TurnCredentialsResponse,
    { ttl: number }
  >(url, { ttl }, { Authorization: `Bearer ${turnKeyApiToken}` });

  const itemWithCreds = credentialsResponse.iceServers?.find(
    (item) => !!item.username && !!item.credential,
  );

  if (!itemWithCreds)
    throw new Error(
      `Cloudflare Realtime API returned no usable ICE server credentials: ${JSON.stringify(credentialsResponse)}`,
    );

  return {
    username: itemWithCreds.username!,
    credential: itemWithCreds.credential!,
  };
}
