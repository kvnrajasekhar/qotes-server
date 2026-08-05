import cloudinary from "../../config/cloudinary.config";

// unlinkAsync intentionally removed since not used; keep imports minimal

interface CloudinaryService {
  getPublicIdFromUrl: (imageUrl: string, folderName?: string) => string | null;
  uploadImage: (filePath: string, folderName?: string) => Promise<string>;
  deleteImage: (publicId: string) => Promise<void>;
}

const cloudinaryService: CloudinaryService = {
  /**
   * Extracts the Public ID from a full Cloudinary URL based on the folder structure.
   * @param {string} imageUrl - The full URL of the image.
   * @param {string} folderName - The Cloudinary folder (e.g., 'quotes-app/avatars').
   * @returns {string | null} - The Public ID, or null if the URL doesn't match the expected structure.
   */
  getPublicIdFromUrl: (
    imageUrl: string,
    folderName = "quotes-app/avatars",
  ): string | null => {
    const folderEscaped = folderName.replace(/[/.]/g, "\\$&");
    const regex = new RegExp(`${folderEscaped}/([^/]+)\\.`, "i");
    const match = imageUrl.match(regex);
    return match ? match[1] : null;
  },

  /**
   * Uploads a file to Cloudinary in the specified folder and retrieves the URL.
   * @param {string} filePath - The temporary path of the file saved by Multer.
   * @param {string} folderName - The Cloudinary folder (e.g., 'qotes-app/avatars').
   * @returns {string}
   */
  uploadImage: async (
    filePath: string,
    folderName = "qotes-app/avatars",
  ): Promise<string> => {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: folderName,
        transformation: [
          { width: 300, height: 300, crop: "fill", gravity: "face" },
        ],
        resource_type: "image",
      });

      return result.secure_url;
    } catch (error) {
      console.error("Cloudinary Upload Error:", error);
      throw error;
    }
  },

  /**
   * Deletes an image from Cloudinary using its Public ID.
   * @param {string} publicId - The Public ID of the image to delete.
   */
  deleteImage: async (publicId: string): Promise<void> => {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
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

export default cloudinaryService;
