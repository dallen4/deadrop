export type ErrorBody = {
  message: string;
};

export type CreateVaultResponse = {
  id: string;
  name: string;
  hostname: string;
  token: string;
};
