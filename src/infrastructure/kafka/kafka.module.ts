import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { producer } from './config/kafka.config';

@Module({
  providers: [
    {
      provide: 'KAFKA_PRODUCER',
      useFactory: async (_configService: ConfigService) => {
        if (process.env.ENABLE_KAFKA !== 'true') {
          return null;
        }

        return producer;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['KAFKA_PRODUCER'],
})
export class KafkaModule { }
