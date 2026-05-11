export enum AppHeaders {
  ContentType = 'content-type',
  IpAddress = 'cf-connecting-ip',
}

export enum ContentType {
  Plaintext = 'text/plain',
  FormData = 'application/x-www-form-urlencoded',
  Json = 'application/json',
}

export type AppRouteParts =
  (typeof AppRouteParts)[keyof typeof AppRouteParts];

export const AppRouteParts = {
  Root: '/',
  Drop: '/drop',

  // auth
  AuthRoot: '/auth',
  CreateSignInToken: '/token',
  Me: '/me',

  // peerjs
  PeerJsRoot: '/peerjs',
  GenerateId: '/id',

  // vaults
  VaultRoot: '/vault',
  NameParam: '/:name',
  Share: '/:name/share',

  // TODO not implemented
  VaultExists: '/:name/exists',
} as const;

export type AppRoutes = (typeof AppRoutes)[keyof typeof AppRoutes];

export const AppRoutes = {
  Root: AppRouteParts.Root,
  Drop: AppRouteParts.Drop,

  // auth
  AuthRoot: AppRouteParts.AuthRoot,
  AuthCreateSignInToken: `${AppRouteParts.AuthRoot}${AppRouteParts.CreateSignInToken}` as const,
  AuthMe: `${AppRouteParts.AuthRoot}${AppRouteParts.Me}` as const,

  // peerjs paths
  PeerJsRoot: AppRouteParts.PeerJsRoot,
  PeerJsGenerateId: `${AppRouteParts.PeerJsRoot}${AppRouteParts.GenerateId}` as const,

  // vault paths
  VaultRoot: AppRouteParts.VaultRoot,
  ShareVault: `${AppRouteParts.VaultRoot}${AppRouteParts.NameParam}${AppRouteParts.Share}` as const,
} as const;
