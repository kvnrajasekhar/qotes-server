import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport } from "nodemailer";

@Module({
  providers: [
    {
      provide: "MAILER_TRANSPORT",
      useFactory: (configService: ConfigService) => {
        return createTransport({
          host: configService.get("SMTP_HOST"),
          port: configService.get("SMTP_PORT"),
          secure: configService.get("SMTP_SECURE") === "true",
          auth: {
            user: configService.get("SMTP_USER"),
            pass: configService.get("SMTP_PASS"),
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ["MAILER_TRANSPORT"],
})
export class MailerModule {}
