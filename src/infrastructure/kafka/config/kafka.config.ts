import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { Kafka, Producer, SASLOptions } from 'kafkajs';
import logger from '../../../shared/utils/logger.util';

process.env.KAFKAJS_NO_PARTITIONER_WARNING ??= '1';

const kafkaBrokers = (process.env.KAFKA_BROKERS || '')
  .split(',')
  .map(broker => broker.trim())
  .filter(Boolean);

if (kafkaBrokers.length === 0) {
  throw new Error('KAFKA_BROKERS environment variable is required');
}

if (!process.env.KAFKA_USERNAME || !process.env.KAFKA_PASSWORD) {
  throw new Error('KAFKA_USERNAME and KAFKA_PASSWORD are required');
}

// Production-grade SSL configuration loader
const buildSslConfig = () => {
  // 1. Production Path: Decode Base64 environment variable cleanly
  if (process.env.KAFKA_CA_CERT_BASE64) {
    try {
      const decodedBuffer = Buffer.from(process.env.KAFKA_CA_CERT_BASE64, 'base64');
      if (decodedBuffer.length > 0) {
        logger.info(
          '[Kafka SSL] Successfully loaded CA certificate from KAFKA_CA_CERT_BASE64 env var'
        );
        return {
          rejectUnauthorized: true,
          ca: [decodedBuffer],
          servername: 'kafka-qotes-kanagalavnrajasekhar-qotes.k.aivencloud.com',
        };
      }
    } catch (err) {
      logger.error('[Kafka SSL] Failed to decode KAFKA_CA_CERT_BASE64 string', err);
    }
  }

  // 2. Development / Fallback Paths: Check local disk storage
  const candidatePaths = [
    process.env.KAFKA_CA_LOCATION
      ? path.resolve(process.cwd(), process.env.KAFKA_CA_LOCATION)
      : null,
    path.resolve(process.cwd(), 'certs', 'ca.pem'),
    '/app/certs/ca.pem',
  ].filter((p): p is string => Boolean(p));

  for (const certPath of candidatePaths) {
    if (fs.existsSync(certPath)) {
      const buffer = fs.readFileSync(certPath);
      if (buffer.length > 0) {
        logger.info(`[Kafka SSL] Successfully loaded CA certificate from disk: ${certPath}`);
        return {
          rejectUnauthorized: true,
          ca: [buffer],
          servername: 'kafka-qotes-kanagalavnrajasekhar-qotes.k.aivencloud.com',
        };
      }
    }
  }

  // Fail explicitly if no valid certificate configuration is found
  const errorMsg =
    '[Kafka SSL] FATAL: No valid CA certificate found in environment variables or disk paths.';
  logger.error(errorMsg);
  throw new Error(errorMsg);
};

const saslConfig: SASLOptions = {
  mechanism: 'scram-sha-256',
  username: process.env.KAFKA_USERNAME,
  password: process.env.KAFKA_PASSWORD,
};

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'qotes-server',
  brokers: kafkaBrokers,
  ssl: buildSslConfig(),
  sasl: saslConfig,
  retry: {
    retries: 10,
    initialRetryTime: 300,
  },
});

const producer: Producer = kafka.producer();
let isProducerConnected = false;

const connectKafka = async (): Promise<void> => {
  if (!isProducerConnected) {
    await producer.connect();
    isProducerConnected = true;
    logger.info('Kafka producer connected globally', {
      service: 'kafka',
      brokers: kafkaBrokers,
    });
  }
};

const disconnectKafka = async (): Promise<void> => {
  if (isProducerConnected) {
    await producer.disconnect();
    isProducerConnected = false;
    logger.info('Kafka producer disconnected', { service: 'kafka' });
  }
};

const isKafkaConnected = (): boolean => isProducerConnected;

export { kafka, producer, connectKafka, disconnectKafka, isKafkaConnected };
