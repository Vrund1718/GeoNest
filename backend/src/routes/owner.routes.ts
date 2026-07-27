import express from 'express';
import {
  createPGListing,
  getOwnerPGs,
  getOwnerPGById,
  updatePGListing,
  deletePGListing,
  uploadPGImages,
  deletePGImage,
  setPrimaryPGImage,
  getAmenities,
} from '../controllers/owner.controller';
import { uploadPGImages as multerUpload } from '../utils/multer';

const router = express.Router();

router.post('/pg', createPGListing);
router.get('/pg', getOwnerPGs);
router.get('/amenities', getAmenities);
router.get('/pg/:id', getOwnerPGById);
router.put('/pg/:id', updatePGListing);
router.delete('/pg/:id', deletePGListing);
router.post('/pg/:id/images', multerUpload.array('images', 8), uploadPGImages);
router.delete('/pg/:id/images/:imageId', deletePGImage);
router.put('/pg/:id/images/:imageId/primary', setPrimaryPGImage);

export default router;
