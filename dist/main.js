"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const database_1 = require("./config/database");
const kafka_config_1 = require("./infrastructure/kafka/config/kafka.config");
const initTopics_1 = __importDefault(require("./infrastructure/kafka/initTopics"));
const notification_socket_1 = require("./modules/notifications/notification.socket");
const logger_util_1 = __importDefault(require("./shared/utils/logger.util"));
const response_interceptor_1 = require("./shared/interceptors/response.interceptor");
const http_exception_filter_1 = require("./shared/filters/http-exception.filter");
const logger_middleware_1 = require("./shared/middlewares/logger.middleware");
const metrics_1 = require("./shared/observability/metrics");
async function bootstrap() {
    logger_util_1.default.info('Starting application bootstrap', {
        service: 'bootstrap',
        env: process.env.NODE_ENV || 'development',
    });
    await (0, database_1.connectToDatabase)();
    logger_util_1.default.info('Database connection ready', { service: 'bootstrap' });
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });
    app.enableCors({
        origin: '*',
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    });
    app.use(logger_middleware_1.requestLogger);
    app.use(metrics_1.observeRequest);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalInterceptors(new response_interceptor_1.ResponseInterceptor());
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    const port = process.env.PORT || 3030;
    const server = await app.listen(port);
    logger_util_1.default.info('HTTP server started', {
        port,
        env: process.env.NODE_ENV || 'development',
    });
    (0, notification_socket_1.initializeSocket)(server);
    if (process.env.ENABLE_KAFKA === 'true') {
        try {
            logger_util_1.default.info('Starting optional Kafka messaging', { service: 'kafka' });
            await (0, kafka_config_1.connectKafka)();
            await (0, initTopics_1.default)();
            logger_util_1.default.info('Kafka messaging is ready', { service: 'kafka' });
        }
        catch (err) {
            logger_util_1.default.error('Kafka is unavailable; API will continue without async messaging', {
                service: 'kafka',
                error: err,
            });
        }
    }
    else {
        logger_util_1.default.info('Kafka messaging skipped; set ENABLE_KAFKA=true to enable it', {
            service: 'kafka',
            env: process.env.NODE_ENV || 'development',
        });
    }
}
bootstrap().catch((err) => {
    logger_util_1.default.error('Failed to start API server', { error: err, stack: err.stack });
    process.exit(1);
});
//# sourceMappingURL=main.js.map