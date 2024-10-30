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

  // auth
  AuthRoot = '/auth',
  CreateSignInToken = '/token',
  Me = '/me',
}

export enum AppRoutes {
  Root = '/',
  Drop = '/drop',

  // auth
  AuthRoot = '/auth',
  AuthCreateSignInToken = '/auth/token',
  CreateSignInToken = '/token',
  AuthMe = '/auth/me',
  Me = '/me',

  // peerjs paths
  PeerJsRoot = '/peerjs',
  PeerJsGenerateId = '/peerjs/id',
  GenerateId = '/id',
}
