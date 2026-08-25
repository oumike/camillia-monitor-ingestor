import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { API_KEY_HEADER, API_KEY_SCHEME } from './auth/api-key.guard';
import { AppConfig } from './config/configuration';

const API_PREFIX = 'api';
const DOCS_PATH = `${API_PREFIX}/docs`;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix(API_PREFIX);
  app.enableShutdownHooks();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = app.get(ConfigService<AppConfig, true>);
  const port = config.get('port', { infer: true });

  const openApiConfig = new DocumentBuilder()
    .setTitle('Camillia Monitor Ingestor')
    .setDescription('REST API for Meshtastic mesh monitoring and ingestion.')
    .setVersion(process.env.npm_package_version ?? '0.1.0')
    .addTag('status', 'Service health and mesh summary')
    .addTag('nodes', 'Mesh nodes and what has been heard from them')
    .addTag('messages', 'Packets heard on the air')
    .addTag('mqtt', 'Topics observed on an MQTT broker')
    .addApiKey(
      { type: 'apiKey', name: API_KEY_HEADER, in: 'header' },
      API_KEY_SCHEME,
    )
    .build();

  // The Swagger path is absolute — the global prefix is not applied to it.
  SwaggerModule.setup(DOCS_PATH, app, () => SwaggerModule.createDocument(app, openApiConfig), {
    jsonDocumentUrl: `${DOCS_PATH}/json`,
    swaggerOptions: { defaultModelsExpandDepth: 1 },
  });

  await app.listen(port);
  Logger.log(`Listening on http://localhost:${port}/${API_PREFIX}`, 'Bootstrap');
  Logger.log(`API docs on http://localhost:${port}/${DOCS_PATH}`, 'Bootstrap');
}

void bootstrap();
