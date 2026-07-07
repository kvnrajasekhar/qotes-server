"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const cloudinary_config_1 = __importDefault(
  require("../../config/cloudinary.config"),
);
const util_1 = require("util");
const fs_1 = require("fs");
const unlinkAsync = (0, util_1.promisify)(fs_1.unlink);
const cloudinaryService = {
  getPublicIdFromUrl: (imageUrl, folderName = "quotes-app/avatars") => {
    const folderEscaped = folderName.replace(/[/\.]/g, "\\$&");
    const regex = new RegExp(`${folderEscaped}/([^/]+)\\.`, "i");
    const match = imageUrl.match(regex);
    return match ? match[1] : null;
  },
  uploadImage: async (filePath, folderName = "qotes-app/avatars") => {
    try {
      const result = await cloudinary_config_1.default.uploader.upload(
        filePath,
        {
          folder: folderName,
          transformation: [
            { width: 300, height: 300, crop: "fill", gravity: "face" },
          ],
          resource_type: "image",
        },
      );
      return result.secure_url;
    } catch (error) {
      console.error("Cloudinary Upload Error:", error);
      throw new Error("Image upload failed.");
    }
  },
  deleteImage: async (publicId) => {
    try {
      const result =
        await cloudinary_config_1.default.uploader.destroy(publicId);
      if (result.result !== "ok") {
        console.warn(
          `Cloudinary deletion failed for ID ${publicId}: ${result.result}`,
        );
      }
    } catch (error) {
      console.error(`Cloudinary deletion error for ID ${publicId}:`, error);
    }
  },
};
exports.default = cloudinaryService;
//# sourceMappingURL=cloudinary.service.js.map
