/**
 * Creates an empty database holding exactly the schema the entities describe.
 *
 * Deliberately not "migrate what is there": the service runs with
 * `synchronize: true`, and SQLite cannot alter a column in place — TypeORM
 * emulates it by rebuilding the table, which it declines to do for some
 * changes and gets wrong for others. Starting from no file at all is the only
 * way to be certain the schema on disk is the schema in the code.
 *
 * Not a substitute for migrations once this service holds data worth keeping.
 */
import 'reflect-metadata';

import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';

import { configuration } from '../src/config/configuration';
import { MessageEntity } from '../src/persistence/sqlite/entities/message.entity';
import { MqttCaptureEntity } from '../src/persistence/sqlite/entities/mqtt-capture.entity';
import { NodeEntity } from '../src/persistence/sqlite/entities/node.entity';

/** The same list the running service registers. */
const ENTITIES = [NodeEntity, MessageEntity, MqttCaptureEntity];

function resolveDatabasePath(): string {
  const { driver, sqlite } = configuration().database;
  if (driver !== 'sqlite') {
    throw new Error(
      `DB_DRIVER is "${driver}"; this script only rebuilds the SQLite store. ` +
        'Reset a MongoDB deployment with mongo tooling instead.',
    );
  }
  return sqlite.database;
}

async function rebuild(database: string): Promise<void> {
  if (existsSync(database)) {
    throw new Error(
      `${database} still exists. This script builds a fresh schema and will not ` +
        'touch an existing file — delete it first (scripts/reset-db.sh does).',
    );
  }

  // `synchronize` against a missing file creates it, then every table and index
  // the entities declare. Nothing else here writes DDL.
  const source = new DataSource({
    type: 'better-sqlite3',
    database,
    entities: ENTITIES,
    synchronize: true,
  });

  await source.initialize();
  try {
    for (const meta of source.entityMetadatas) {
      const columns = meta.columns.map((c) => c.databaseName).join(', ');
      console.log(`  ${meta.tableName} (${meta.columns.length}): ${columns}`);
    }
  } finally {
    await source.destroy();
  }
}

async function main(): Promise<void> {
  const database = resolveDatabasePath();

  // Lets the shell script resolve the path the same way the service does,
  // rather than parsing .env a second time in bash.
  if (process.argv.includes('--print-path')) {
    console.log(database);
    return;
  }

  await rebuild(database);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
