import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { StorageHealth, StorageHealthIndicator } from '../repositories';

@Injectable()
export class SqliteStorageHealthIndicator implements StorageHealthIndicator {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async check(): Promise<StorageHealth> {
    try {
      await this.dataSource.query('SELECT 1');
      return { driver: 'sqlite', connected: true };
    } catch (error) {
      return {
        driver: 'sqlite',
        connected: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
