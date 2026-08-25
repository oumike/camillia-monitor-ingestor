import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

import { AppConfig } from '../config/configuration';

export const API_KEY_HEADER = 'x-api-key';

/** Name of the OpenAPI security scheme registered in `main.ts`. */
export const API_KEY_SCHEME = 'api-key';

/**
 * Guards write endpoints so only our own firmware can push data.
 *
 * With no keys configured the guard lets everything through and says so at
 * startup — that keeps a fresh checkout usable, but any deployment reachable
 * from outside localhost must set `INGEST_API_KEYS`.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private readonly hashedKeys: Buffer[];
  private readonly enabled: boolean;

  constructor(config: ConfigService<AppConfig, true>) {
    const keys = config.get('security', { infer: true }).ingestApiKeys;
    this.enabled = keys.length > 0;
    this.hashedKeys = keys.map((key) => ApiKeyGuard.digest(key));

    if (!this.enabled) {
      this.logger.warn('INGEST_API_KEYS is empty — write endpoints are UNAUTHENTICATED.');
    }
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.enabled) {
      return true;
    }

    const presented = this.extractKey(context.switchToHttp().getRequest<Request>());
    if (!presented || !this.matches(presented)) {
      throw new UnauthorizedException('Missing or invalid API key.');
    }
    return true;
  }

  private extractKey(request: Request): string | null {
    const header = request.headers[API_KEY_HEADER];
    if (typeof header === 'string' && header.length > 0) {
      return header;
    }

    const authorization = request.headers.authorization;
    if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
      return authorization.slice('Bearer '.length);
    }

    return null;
  }

  /**
   * Compares SHA-256 digests so the comparison is constant time and unaffected
   * by key length.
   */
  private matches(presented: string): boolean {
    const candidate = ApiKeyGuard.digest(presented);
    return this.hashedKeys.some((known) => timingSafeEqual(known, candidate));
  }

  private static digest(key: string): Buffer {
    return createHash('sha256').update(key, 'utf8').digest();
  }
}
