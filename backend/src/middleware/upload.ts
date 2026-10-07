import multer from 'multer';
import { config, isCloudinaryEnabled } from '../config';
import { v2 as cloudinary } from 'cloudinary';

if (isCloudinaryEnabled) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WEBP images are allowed'), false);
  }
};

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadImage = async (file: Express.Multer.File): Promise<{ url: string; isCloudinary: boolean }> => {
  if (isCloudinaryEnabled) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'smart-pg' },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Cloudinary upload failed'));
          }
          resolve({ url: result.secure_url, isCloudinary: true });
        }
      );
      uploadStream.end(file.buffer);
    });
  }

  // Fallback when Cloudinary is not configured: Data URI (works on Vercel read-only filesystem)
  const base64 = file.buffer.toString('base64');
  const dataUri = `data:${file.mimetype};base64,${base64}`;
  return { url: dataUri, isCloudinary: false };
};

