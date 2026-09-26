"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.isKafkaConnected = exports.disconnectKafka = exports.connectKafka = exports.producer = exports.kafka = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const kafkajs_1 = require("kafkajs");
const logger_util_1 = __importDefault(require("../../../shared/utils/logger.util"));
(_a = process.env).KAFKAJS_NO_PARTITIONER_WARNING ?? (_a.KAFKAJS_NO_PARTITIONER_WARNING = '1');
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
const buildSslConfig = () => {
    if (process.env.KAFKA_CA_CERT) {
        return {
            rejectUnauthorized: true,
            ca: [process.env.KAFKA_CA_CERT.replace(/\\n/g, '\n')],
        };
    }
    const caPath = path_1.default.resolve(process.cwd(), 'certs', 'ca.pem');
    if (fs_1.default.existsSync(caPath)) {
        return {
            rejectUnauthorized: true,
            ca: [fs_1.default.readFileSync(caPath, 'utf-8')],
        };
    }
    throw new Error(`Kafka CA certificate not found at ${caPath} and KAFKA_CA_CERT is not defined.`);
};
const saslConfig = {
    mechanism: 'scram-sha-256',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
};
const kafka = new kafkajs_1.Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || 'qotes-server',
    brokers: kafkaBrokers,
    ssl: buildSslConfig(),
    sasl: saslConfig,
    retry: {
        retries: 10,
        initialRetryTime: 300,
    },
});
exports.kafka = kafka;
const producer = kafka.producer();
exports.producer = producer;
let isProducerConnected = false;
const connectKafka = async () => {
    if (!isProducerConnected) {
        await producer.connect();
        isProducerConnected = true;
        logger_util_1.default.info('Kafka producer connected globally', {
            service: 'kafka',
            brokers: kafkaBrokers,
        });
    }
};
exports.connectKafka = connectKafka;
const disconnectKafka = async () => {
    if (isProducerConnected) {
        await producer.disconnect();
        isProducerConnected = false;
        logger_util_1.default.info('Kafka producer disconnected', { service: 'kafka' });
    }
};
exports.disconnectKafka = disconnectKafka;
const isKafkaConnected = () => isProducerConnected;
exports.isKafkaConnected = isKafkaConnected;
//# sourceMappingURL=kafka.config.js.map