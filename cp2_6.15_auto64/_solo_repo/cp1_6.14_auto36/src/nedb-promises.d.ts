declare module 'nedb-promises' {
  interface DatastoreOptions {
    filename?: string;
    inMemoryOnly?: boolean;
    autoload?: boolean;
    timestampData?: boolean;
  }

  interface FindOptions {
    sort?: Record<string, number>;
    skip?: number;
    limit?: number;
  }

  interface UpdateOptions {
    multi?: boolean;
    upsert?: boolean;
    returnUpdatedDocs?: boolean;
  }

  interface RemoveOptions {
    multi?: boolean;
  }

  class Datastore {
    constructor(options?: DatastoreOptions);
    static create(options?: DatastoreOptions): Datastore;
    loadDatabase(): Promise<void>;
    insert<T>(doc: T): Promise<T>;
    insert<T>(docs: T[]): Promise<T[]>;
    find<T>(query: any, projection?: any): Promise<T[]>;
    findOne<T>(query: any, projection?: any): Promise<T | null>;
    find<T>(query: any, projection?: any): {
      sort(sort: Record<string, number>): any;
      skip(n: number): any;
      limit(n: number): any;
      exec(): Promise<T[]>;
    };
    count(query: any): Promise<number>;
    update(query: any, update: any, options?: UpdateOptions): Promise<number | any>;
    remove(query: any, options?: RemoveOptions): Promise<number>;
    ensureIndex(options: any): Promise<void>;
  }

  export = Datastore;
}
