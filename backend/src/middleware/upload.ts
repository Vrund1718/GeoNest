import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config, isCloudinaryEnabled } from '../config';
import { v2 as cloudinary } from 'cloudinary';

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

if (isCloudinaryEnabled) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `img-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

const fileFilter = (req: any, file: any, cb: any) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, WEBP, and GIF images are allowed'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadImage = async (filePath: string): Promise<{ url: string; isCloudinary: boolean }> => {
  if (isCloudinaryEnabled) {
    const result = await cloudinary.uploader.upload(filePath, { folder: 'smart-pg' });
    fs.unlinkSync(filePath);
    return { url: result.secure_url, isCloudinary: true };
  }
  const relative = `/uploads/${path.basename(filePath)}`;
  return { url: relative, isCloudinary: false };
};
