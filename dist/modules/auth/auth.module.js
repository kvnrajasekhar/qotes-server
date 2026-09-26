"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const throttler_1 = require("@nestjs/throttler");
const config_1 = require("@nestjs/config");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const auth_guard_1 = require("../../shared/guards/auth.guard");
const user_model_1 = require("../../models/user.model");
const token_model_1 = require("../../models/token.model");
const media_module_1 = require("../../infrastructure/media/media.module");
const mailer_module_1 = require("../../infrastructure/mailer/mailer.module");
const kafka_module_1 = require("../../infrastructure/kafka/kafka.module");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'User', schema: user_model_1.UserSchema },
                { name: 'Token', schema: token_model_1.tokenSchema },
            ]),
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: async (configService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: { expiresIn: '25m' },
                }),
            }),
            throttler_1.ThrottlerModule,
            media_module_1.MediaModule,
            mailer_module_1.MailerModule,
            kafka_module_1.KafkaModule,
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService, jwt_strategy_1.JwtStrategy, auth_guard_1.AuthGuard],
        exports: [auth_service_1.AuthService, auth_guard_1.AuthGuard, jwt_1.JwtModule, passport_1.PassportModule, mongoose_1.MongooseModule],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map