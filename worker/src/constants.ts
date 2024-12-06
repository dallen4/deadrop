export enum AppHeaders {
  ContentType = 'content-type',
  IpAddress = 'cf-connecting-ip',
}

export enum ContentType {
  Plaintext = 'text/plain',
  FormData = 'application/x-www-form-urlencoded',
  Json = 'application/json',
}

export enum AppRouteParts {
  Root = '/',
  Drop = '/drop',

  // auth
  AuthRoot = '/auth',
  CreateSignInToken = '/token',
  Me = '/me',

  // peerjs
  PeerJsRoot = '/peerjs',
  GenerateId = `/id`,
}

export enum AppRoutes {
  Root = AppRouteParts.Root,
  Drop = AppRouteParts.Drop,

  // auth
  AuthRoot = AppRouteParts.AuthRoot,
  AuthCreateSignInToken = `${AppRouteParts.AuthRoot}${AppRouteParts.CreateSignInToken}`,
  AuthMe = `${AppRouteParts.AuthRoot}${AppRouteParts.Me}`,

  // peerjs paths
  PeerJsRoot = AppRouteParts.PeerJsRoot,
  PeerJsGenerateId = `${AppRouteParts.PeerJsRoot}${AppRouteParts.GenerateId}`,
}
