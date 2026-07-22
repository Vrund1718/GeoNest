import express from 'express';
import {
  signup,
  login,
  getMe,
  refresh,
  logout,
} from '../controllers/auth.controller';
import { protect } from '../middleware/auth.middleware';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;
