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
            ca: [Buffer.from(process.env.KAFKA_CA_CERT.replace(/\\n/g, '\n'), 'utf-8')],
        };
    }
    const candidatePaths = [
        process.env.KAFKA_CA_LOCATION ? path_1.default.resolve(process.cwd(), process.env.KAFKA_CA_LOCATION) : null,
        path_1.default.resolve(process.cwd(), 'certs', 'ca.pem'),
        '/app/certs/ca.pem',
        path_1.default.resolve(__dirname, '../../../../certs/ca.pem'),
    ].filter((p) => Boolean(p));
    for (const certPath of candidatePaths) {
        if (fs_1.default.existsSync(certPath)) {
            const buffer = fs_1.default.readFileSync(certPath);
            if (buffer.length > 0) {
                logger_util_1.default.info(`[Kafka SSL] CA certificate loaded successfully from: ${certPath}`);
                return {
                    rejectUnauthorized: true,
                    ca: [buffer],
                };
            }
        }
    }
    const errorMsg = `[Kafka SSL] CA certificate not found in paths: ${candidatePaths.join(', ')}`;
    logger_util_1.default.error(errorMsg);
    throw new Error(errorMsg);
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