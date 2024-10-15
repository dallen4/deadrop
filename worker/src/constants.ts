export enum AppHeaders {
  ContentType = 'content-type',
  IpAddress = 'cf-connecting-ip',
}

export enum ContentType {
  Plaintext = 'text/plain',
  FormData = 'application/x-www-form-urlencoded',
  Json = 'application/json',
}

export enum AppRoutes {
  Root = '/',
  Drop = '/drop',

  // peerjs paths
  PeerJsRoot = '/peerjs',
  PeerJsGenerateId = '/peerjs/id',
  GenerateId = '/id',
}
