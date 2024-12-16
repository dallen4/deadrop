import { deleteReq, post } from '@shared/lib/fetch';
import { hash } from './crypto';
import {
  CreateDatabaseRequest,
  CreateDatabaseResponse,
  GetDatabaseResponse,
} from '@shared/types/db';

export const vaultNameFromUserId = async (
  userId: string,
  vaultName?: string,
) => {
  const userIdHash = await hash(userId);
  const nameParts = [userIdHash.substring(0, 13)];

  if (vaultName) nameParts.push(vaultName);

  return nameParts.join('-').substring(0, 63);
};

export const createVaultUtils = (
  organization: string,
  apiToken: string,
) => {
  const baseUrl = new URL(
    `https://api.turso.tech/v1/organizations/${organization}/databases`,
  );

  const headers = {
    Authorization: `Bearer ${apiToken}`,
  };

  const buildUrl = (path: string) => {
    const reqUrl = new URL(baseUrl.toString());

    reqUrl.pathname += path;

    return reqUrl;
  };

  const createVault = async (vaultName: string) => {
    const reqUrl = new URL(baseUrl.toString()).toString();

    const body = {
      name: vaultName,
      group: 'deadrop',
    };

    const { database } = await post<
      CreateDatabaseResponse,
      CreateDatabaseRequest
    >(reqUrl, body, headers);

    return database;
  };

  const createVaultToken = async (
    vaultName: string,
    access: 'full-access' | 'read-only',
  ) => {
    const reqUrl = buildUrl(`/${vaultName}/auth/tokens`);

    // no expiration for now
    // reqUrl.searchParams.set('expiration', '2w');

    reqUrl.searchParams.set('authorization', access);

    const { jwt: token } = await post<{ jwt: string }, {}>(
      reqUrl.toString(),
      undefined,
      headers,
    );

    return token;
  };

  const getVault = async (vaultName: string) => {
    const reqUrl = buildUrl(`/${vaultName}`);

    const { database } = await post<GetDatabaseResponse, undefined>(
      reqUrl.toString(),
    );

    return database;
  };

  const deleteVault = async (vaultName: string) => {
    const reqUrl = buildUrl(`/${vaultName}`);

    const resp = await deleteReq<
      Partial<{ database: string; error: string }>,
      undefined
    >(reqUrl.toString());

    if (resp.database) return true;
    return false;
  };

  return { createVault, createVaultToken, getVault, deleteVault };
};
