"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cloudinary_1 = require("cloudinary");
let MediaModule = class MediaModule {
};
exports.MediaModule = MediaModule;
exports.MediaModule = MediaModule = __decorate([
    (0, common_1.Module)({
        providers: [
            {
                provide: "CLOUDINARY",
                useFactory: (configService) => {
                    cloudinary_1.v2.config({
                        cloud_name: configService.get("CLOUDINARY_CLOUD_NAME"),
                        api_key: configService.get("CLOUDINARY_API_KEY"),
                        api_secret: configService.get("CLOUDINARY_API_SECRET"),
                    });
                    return cloudinary_1.v2;
                },
                inject: [config_1.ConfigService],
            },
            {
                provide: "CLOUDINARY_SERVICE",
                useFactory: () => {
                    const cloudinaryService = require("./cloudinary.service").default;
                    return cloudinaryService;
                },
            },
        ],
        exports: ["CLOUDINARY", "CLOUDINARY_SERVICE"],
    })
], MediaModule);
//# sourceMappingURL=media.module.js.map