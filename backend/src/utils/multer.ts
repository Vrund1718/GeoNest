import multer from 'multer';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 8;
const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

export const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
  if (!ALLOWED_MIMES.includes(file.mimetype) || !ALLOWED_EXTS.includes(ext)) {
    const error: any = new Error('only jpg/png/webp allowed');
    error.code = 'INVALID_FILE_TYPE';
    return cb(error);
  }
  cb(null, true);
};

const storage = multer.memoryStorage();

export const uploadPGImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
});

export const validateUploadedFiles = (files: Express.Multer.File[] | undefined) => {
  if (!files || files.length === 0) {
    const error: any = new Error('at least one image is required');
    error.code = 'NO_FILES_UPLOADED';
    error.status = 400;
    throw error;
  }

  if (files.length > MAX_FILES) {
    const error: any = new Error(`maximum ${MAX_FILES} files allowed`);
    error.code = 'TOO_MANY_FILES';
    error.status = 400;
    throw error;
  }

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      const error: any = new Error('images must be under 5MB');
      error.code = 'FILE_TOO_BIG';
      error.status = 400;
      throw error;
    }

    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (!ALLOWED_MIMES.includes(file.mimetype) || !ALLOWED_EXTS.includes(ext)) {
      const error: any = new Error('only jpg/png/webp allowed');
      error.code = 'INVALID_FILE_TYPE';
      error.status = 400;
      throw error;
    }
  }
};
