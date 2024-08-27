export type IceServerCredentials = {
  username?: string;
  credential: string;
};

export type IceServerConfigurationItem = {
  urls: string;
} & IceServerCredentials;

export type IceServerConfiguration = IceServerConfigurationItem[];
