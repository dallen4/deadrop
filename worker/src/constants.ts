export enum AppHeaders {
  ContentType = 'content-type',
  IpAddress = 'cf-connecting-ip',
}

export enum ContentType {
  Plaintext = 'text/plain',
  FormData = 'application/x-www-form-urlencoded',
  Json = 'application/json',
}

export enum PeerJsRoutes {
  Index = '/',
  PeerJs = '/peerjs',
  GenerateId = '/peerjs/id',
}

export enum DeadropRoutes {
  Drop = '/drop',
}
