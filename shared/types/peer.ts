export type IceServerCredentials = {
  username: string;
  credential: string;
};

export type IceServerConfigurationItem = {
  urls: string[];
} & Partial<IceServerCredentials>;

export type IceServerConfiguration = IceServerConfigurationItem[];
