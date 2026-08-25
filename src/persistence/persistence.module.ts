import { DynamicModule, Module } from '@nestjs/common';

import { configuration, DatabaseDriver } from '../config/configuration';
import { SqlitePersistenceModule } from './sqlite/sqlite-persistence.module';

/**
 * Single place where a concrete store is chosen. Everything downstream depends
 * only on the tokens in `./repositories`, so swapping SQLite for MongoDB is a
 * change to this switch plus one new module.
 */
@Module({})
export class PersistenceModule {
  static forRoot(): DynamicModule {
    const driver: DatabaseDriver = configuration().database.driver;
    const implementation = PersistenceModule.resolve(driver);

    return {
      module: PersistenceModule,
      imports: [implementation],
      exports: [implementation],
      global: true,
    };
  }

  private static resolve(driver: DatabaseDriver) {
    switch (driver) {
      case 'sqlite':
        return SqlitePersistenceModule;
      case 'mongodb':
        throw new Error(
          'DB_DRIVER=mongodb is not implemented yet. See src/persistence/mongodb/README.md.',
        );
    }
  }
}
