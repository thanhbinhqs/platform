export interface IUnitOfWork {
  /** Execute work in a transaction */
  execute<T>(work: () => Promise<T>): Promise<T>;

  /** Get current transaction client */
  getTransactionClient<T>(): T | null;

  /** Whether a transaction is active */
  isActive(): boolean;
}
