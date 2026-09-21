import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthGuard } from '../../shared/guards/auth.guard';
import { UserSchema } from '../../models/user.model';
import { tokenSchema } from '../../models/token.model';
import { MediaModule } from '../../infrastructure/media/media.module';
import { MailerModule } from '../../infrastructure/mailer/mailer.module';
import { KafkaModule } from '../../infrastructure/kafka/kafka.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Token', schema: tokenSchema },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '25m' },
      }),
    }),
    ThrottlerModule,
    MediaModule,
    MailerModule,
    KafkaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AuthGuard],
  exports: [AuthService, AuthGuard, JwtModule, PassportModule, MongooseModule],
})
export class AuthModule {}
