import { config as loadEnvFile } from 'dotenv';

// Loaded here rather than only via ConfigModule: the persistence driver is
// resolved while modules are being assembled, before Nest reads the .env file.
loadEnvFile();

export type DatabaseDriver = 'sqlite' | 'mongodb';

export interface AppConfig {
  port: number;
  environment: string;
  security: {
    /** Keys accepted on write endpoints. Empty means auth is disabled. */
    ingestApiKeys: string[];
  };
  database: {
    driver: DatabaseDriver;
    sqlite: { database: string };
    mongodb: { uri: string; database: string };
  };
}

function parseDriver(value: string | undefined): DatabaseDriver {
  const driver = (value ?? 'sqlite').toLowerCase();
  if (driver !== 'sqlite' && driver !== 'mongodb') {
    throw new Error(`Unsupported DB_DRIVER "${value}". Expected "sqlite" or "mongodb".`);
  }
  return driver;
}

function parseApiKeys(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
}

export const configuration = (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  environment: process.env.NODE_ENV ?? 'development',
  security: {
    ingestApiKeys: parseApiKeys(process.env.INGEST_API_KEYS),
  },
  database: {
    driver: parseDriver(process.env.DB_DRIVER),
    sqlite: {
      database: process.env.SQLITE_DATABASE ?? './data/monitor.sqlite',
    },
    mongodb: {
      uri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017',
      database: process.env.MONGODB_DATABASE ?? 'camillia_monitor',
    },
  },
});
