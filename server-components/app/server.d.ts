// `server`: Sluurp as whoever asked, in a "use server" function and while a page is drawn.
declare const server: {
  collection(name: string): {
    list(query?: Record<string, string | number>): Promise<{ items: any[]; totalItems: number }>;
    get(id: string): Promise<any>;
    create(body: unknown): Promise<any>;
    update(id: string, body: unknown): Promise<any>;
    delete(id: string): Promise<void>;
    count(filter?: string): Promise<number>;
  };
};
