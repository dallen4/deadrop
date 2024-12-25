import { ErrorBody } from '../types/fetch';

export const get = async <Data>(
  uri: string,
  params?: { [key: string]: any },
) => {
  let url = uri;

  if (params) {
    const query = new URLSearchParams(params);
    url += '?' + query.toString();
  }

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 404) return null;

  const data: Data = await res.json();

  return data;
};

export const post = async <Data, Body>(
  uri: string,
  body?: Body,
  headers: HeadersInit = {},
) => {
  const res = await fetch(uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data: Data | ErrorBody | { error: string } = await res.json();

  if (res.status === 500)
    throw new Error((data as ErrorBody).message);

  return data as Data;
};

export const deleteReq = async <Data, Body>(
  uri: string,
  body?: Body,
  headers: HeadersInit = {},
) => {
  const res = await fetch(uri, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  return res.json() as Promise<Data>;
};
