export type TursoDatabase = {
  Name: string;
  DbId: string;
  Hostname: string;
  block_reads: boolean;
  block_writes: boolean;
  allow_attach: boolean;
  regions: string[];
  primaryRegion: string;
  type: string;
  version: string;
  group: string;
  delete_protection: boolean;
  is_schema: boolean;
  schema: string;
  archived: boolean;
};

export type CreateDatabaseRequest = {
  name: string;
  group: string;
  schema?: string;
  seed?: { type: 'database_upload' };
};

export type CreateDatabaseResponse = {
  database: Pick<TursoDatabase, 'DbId' | 'Hostname' | 'Name'>;
};

export type UpdateDatabaseResponse = Pick<
  TursoDatabase,
  | 'allow_attach'
  | 'block_reads'
  | 'block_writes'
  | 'delete_protection'
> & {
  size_limit: string; // numeric string
  allowed_ips: string[];
  allowed_aws_vpc_ids: string[];
};

export type UpdateDatabaseRequest = Partial<
  Omit<UpdateDatabaseResponse, 'allow_attach'>
>;

export type GetDatabaseResponse = {
  database: TursoDatabase;
};

export type ListDatabasesResponse = {
  databases: TursoDatabase[];
};
