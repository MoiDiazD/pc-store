export abstract class BaseRepository<TEntity> {
  abstract findById(id: number): Promise<TEntity | undefined>;

  abstract findAll(): Promise<TEntity[]>;

  abstract softDelete(id: number): Promise<TEntity | undefined>;

  abstract restore(id: number): Promise<TEntity | undefined>;
}