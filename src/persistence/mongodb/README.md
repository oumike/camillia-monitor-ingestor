# MongoDB persistence

Not implemented yet. `DB_DRIVER=mongodb` currently fails fast at bootstrap.

To switch the service over, add a `MongoPersistenceModule` here that:

1. Connects with the `mongodb` config block (`MONGODB_URI`, `MONGODB_DATABASE`).
2. Provides `NODE_REPOSITORY` with a `NodeRepository` implementation
   (`src/persistence/repositories/node.repository.ts`) that maps documents to
   the `MeshNode` domain shape.
3. Provides `STORAGE_HEALTH_INDICATOR` with a `StorageHealthIndicator` that
   pings the server and reports `driver: 'mongodb'`.
4. Exports both tokens, then gets wired into the `mongodb` branch of
   `src/persistence/persistence.module.ts`.

Nothing outside `src/persistence/` should need to change: consumers inject the
tokens, never a concrete store.
