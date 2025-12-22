// services/cloudinaryService.js

const cloudinary = require('../config/cloudinary.config');
const { promisify } = require('util'); // To promisify fs.unlink for reliable cleanup
const fs = require('fs');
const unlinkAsync = promisify(fs.unlink);

const cloudinaryService = {

    /**
     * Extracts the Public ID from a full Cloudinary URL based on the folder structure.
     * @param {string} imageUrl - The full URL of the image.
     * @param {string} folderName - The Cloudinary folder (e.g., 'quotes-app/avatars').
     * @returns {string | null} - The Public ID, or null if the URL doesn't match the expected structure.
     */
    getPublicIdFromUrl: (imageUrl, folderName = 'quotes-app/avatars') => {
        // Escaping dots and slashes for regex safety
        const folderEscaped = folderName.replace(/[/\.]/g, '\\$&');

        // Regex to match the part between the last folder slash and the file extension/end of string
        const regex = new RegExp(`${folderEscaped}/([^/]+)\\.`, 'i');

        const match = imageUrl.match(regex);

        // The public ID is in the first capture group of the match (index 1)
        return match ? match[1] : null;
    },

    /**
* Uploads a file to Cloudinary in the specified folder and retrieves the URL.
* @param {string} filePath - The temporary path of the file saved by Multer.
* @param {string} folderName - The Cloudinary folder (e.g., 'qotes-app/avatars').
* @returns {string} 
*/
    uploadImage: async (filePath, folderName = 'qotes-app/avatars') => {
        try {
            const result = await cloudinary.uploader.upload(filePath, {
                folder: folderName,
                transformation: [
                    { width: 300, height: 300, crop: "fill", gravity: "face" }
                ],
                resource_type: "image"
            });

            // Return the secure URL from the result
            return result.secure_url;

        } catch (error) {
            console.error("Cloudinary Upload Error:", error);
            // Throw the error to be caught by the controller
            throw new Error('Image upload failed.');
        }
    },

    /**
     * Deletes an image from Cloudinary using its Public ID.
     * @param {string} publicId - The Public ID of the image to delete.
     */
    deleteImage: async (publicId) => {
        try {
            const result = await cloudinary.uploader.destroy(publicId);
            // Cloudinary destroy returns { result: 'ok' } on success
            if (result.result !== 'ok') {
                // Log a warning if delete was not successful, but don't halt the main process
                console.warn(`Cloudinary deletion failed for ID ${publicId}: ${result.result}`);
            }
        } catch (error) {
            console.error(`Cloudinary deletion error for ID ${publicId}:`, error);
            // We log the error but do not re-throw, as failing to delete the old image shouldn't
            // prevent saving the new image (which is the user's priority).
        }
    }

};

module.exports = cloudinaryService;