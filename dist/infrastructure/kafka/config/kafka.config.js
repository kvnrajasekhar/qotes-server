"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.isKafkaConnected = exports.connectKafka = exports.producer = exports.kafka = void 0;
const kafkajs_1 = require("kafkajs");
const logger_util_1 = __importDefault(require("../../../shared/utils/logger.util"));
(_a = process.env).KAFKAJS_NO_PARTITIONER_WARNING ?? (_a.KAFKAJS_NO_PARTITIONER_WARNING = '1');
const kafkaBrokers = [process.env.KAFKA_BROKER || 'localhost:9092'];
const kafka = new kafkajs_1.Kafka({
    clientId: 'quotely-server',
    brokers: kafkaBrokers,
    retry: {
        retries: 10,
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
const isKafkaConnected = () => isProducerConnected;
exports.isKafkaConnected = isKafkaConnected;
//# sourceMappingURL=kafka.config.js.map