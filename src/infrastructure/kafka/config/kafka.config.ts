import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { Kafka, Producer, SASLOptions } from 'kafkajs';
import logger from '../../../shared/utils/logger.util';

process.env.KAFKAJS_NO_PARTITIONER_WARNING ??= '1';

const kafkaBrokers = (process.env.KAFKA_BROKERS || '')
  .split(',')
  .map((broker) => broker.trim())
  .filter(Boolean);

if (kafkaBrokers.length === 0) {
  throw new Error('KAFKA_BROKERS environment variable is required');
}

if (!process.env.KAFKA_USERNAME || !process.env.KAFKA_PASSWORD) {
  throw new Error('KAFKA_USERNAME and KAFKA_PASSWORD are required');
}

const caCert = fs.readFileSync(path.resolve(__dirname, '../certs/ca.pem'), 'utf-8');
// Build SSL configuration to accommodate Aiven's CA cert
const buildSslConfig = () => {
  if (process.env.KAFKA_CA_CERT) {
    return {
      rejectUnauthorized: true,
      ca: [caCert],
    };
  }

  const caPath = process.env.KAFKA_CA_LOCATION || path.resolve(process.cwd(), 'ca.pem');
  if (fs.existsSync(caPath)) {
    return {
      rejectUnauthorized: true,
      ca: [fs.readFileSync(caPath, 'utf-8')],
    };
  }

  // Fallback to default SSL validation if custom CA is omitted
  return true;
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

export {
  kafka,
  producer,
  connectKafka,
  disconnectKafka,
  isKafkaConnected,
};