export type SqlBindValue = string | number | null | boolean | Uint8Array;

export type DatabaseClient = {
  execAsync: (source: string) => Promise<void>;
  runAsync: (source: string, ...params: SqlBindValue[]) => Promise<{ changes: number }>;
  getFirstAsync: <T>(source: string, ...params: SqlBindValue[]) => Promise<T | null>;
  getAllAsync: <T>(source: string, ...params: SqlBindValue[]) => Promise<T[]>;
};
