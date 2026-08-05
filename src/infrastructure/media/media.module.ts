import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";

@Module({
  providers: [
    {
      provide: "CLOUDINARY",
      useFactory: (configService: ConfigService) => {
        cloudinary.config({
          cloud_name: configService.get("CLOUDINARY_CLOUD_NAME"),
          api_key: configService.get("CLOUDINARY_API_KEY"),
          api_secret: configService.get("CLOUDINARY_API_SECRET"),
        });
        return cloudinary;
      },
      inject: [ConfigService],
    },
    {
      provide: "CLOUDINARY_SERVICE",
      useFactory: async () => {
        // Import the service dynamically to avoid circular dependency
        const mod = await import("./cloudinary.service");
        return mod.default;
      },
    },
  ],
  exports: ["CLOUDINARY", "CLOUDINARY_SERVICE"],
})
export class MediaModule { }
