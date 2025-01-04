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
  is_schema: boolean;
  schema: string;
  archived: boolean;
};

export type CreateDatabaseRequest = {
  name: string;
  group: string;
};

export type CreateDatabaseResponse = {
  database: Pick<TursoDatabase, 'DbId' | 'Hostname' | 'Name'>;
};

export type GetDatabaseResponse = {
  database: TursoDatabase;
};
