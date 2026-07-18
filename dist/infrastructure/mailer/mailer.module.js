"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailerModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer_1 = require("nodemailer");
let MailerModule = class MailerModule {
};
exports.MailerModule = MailerModule;
exports.MailerModule = MailerModule = __decorate([
    (0, common_1.Module)({
        providers: [
            {
                provide: "MAILER_TRANSPORT",
                useFactory: (configService) => {
                    return (0, nodemailer_1.createTransport)({
                        host: configService.get("SMTP_HOST"),
                        port: configService.get("SMTP_PORT"),
                        secure: configService.get("SMTP_SECURE") === "true",
                        auth: {
                            user: configService.get("SMTP_USER"),
                            pass: configService.get("SMTP_PASS"),
                        },
                    });
                },
                inject: [config_1.ConfigService],
            },
        ],
        exports: ["MAILER_TRANSPORT"],
    })
], MailerModule);
//# sourceMappingURL=mailer.module.js.map