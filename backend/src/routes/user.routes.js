import express from 'express';
import { getProfile, updateProfile } from '../controllers/user.controller.js';
import protect from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.get('/profile', protect, getProfile);
router.put('/profile', protect, upload.single('profile_pic'), updateProfile);

export default router;