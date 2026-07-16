import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { connectToDatabase } from "./config/database";
import { connectKafka } from "./infrastructure/kafka/config/kafka.config";
import initTopics from "./infrastructure/kafka/initTopics";
import { initializeSocket } from "./modules/notifications/notification.socket";
import logger from "./shared/utils/logger.util";
import { ResponseInterceptor } from "./shared/interceptors/response.interceptor";
import { HttpExceptionFilter } from "./shared/filters/http-exception.filter";

async function bootstrap() {
  await connectToDatabase();

  const app = await NestFactory.create(AppModule, {
    logger: ["log", "error", "warn", "debug", "verbose"],
  });

  app.enableCors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Apply global response interceptor for consistent API responses
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Apply global exception filter for standardized error handling
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT || 3030;
  const server = await app.listen(port);

  logger.info("HTTP server started", {
    port,
    env: process.env.NODE_ENV || "development",
  });

  // Initialize Socket.IO
  initializeSocket(server);

  // Start optional Kafka messaging
  try {
    logger.info("Starting optional Kafka messaging", { service: "kafka" });
    await connectKafka();
    await initTopics();
    logger.info("Kafka messaging is ready", { service: "kafka" });
  } catch (err) {
    logger.error(
      "Kafka is unavailable; API will continue without async messaging",
      {
        service: "kafka",
        error: err,
      },
    );
  }
}

bootstrap().catch((err: Error) => {
  logger.error("Failed to start API server", { error: err });
  process.exit(1);
});
