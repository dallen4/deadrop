export enum ActorKind {
  Cli = 'cli',
  Web = 'web',
}

// A drop actor performs a drop and STAYS ALIVE (peer connected) until the
// grabber finishes; dispose() tears it down. A grab actor grabs by id and
// returns the decrypted secret.
export interface DropActor {
  readonly kind: ActorKind;
  drop(secret: string): Promise<{ id: string; link: string }>;
  dispose(): Promise<void>;
}

export interface GrabActor {
  readonly kind: ActorKind;
  grab(id: string): Promise<string>; // decrypted secret
  dispose(): Promise<void>;
}
