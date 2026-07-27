import express from 'express';
import {
  getPendingPGsController,
  getPGFullDetailController,
  verifyPGController,
  getComplaints,
  updateComplaint,
  getUsers,
  getOverview,
} from '../controllers/admin.controller';

const router = express.Router();

router.get('/overview', getOverview);
router.get('/pg/pending', getPendingPGsController);
router.get('/pg/:id', getPGFullDetailController);
router.put('/pg/:id/verify', verifyPGController);
router.get('/complaints', getComplaints);
router.put('/complaints/:id', updateComplaint);
router.get('/users', getUsers);

export default router;
