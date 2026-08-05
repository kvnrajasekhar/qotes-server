import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { producer, connectKafka } from "./config/kafka.config";

@Module({
  providers: [
    {
      provide: "KAFKA_PRODUCER",
      useFactory: async (_configService: ConfigService) => {
        await connectKafka();
        return producer;
      },
      inject: [ConfigService],
    },
  ],
  exports: ["KAFKA_PRODUCER"],
})
export class KafkaModule { }
