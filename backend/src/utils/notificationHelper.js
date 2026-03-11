import Notification from '../models/Notification.js';

export const notify = async (userId, type, title, message) => {
  try {
    if (!userId) return; 
    await Notification.create({ userId, type, title, message });
  } catch (err) {
    console.error('Notification failed:', err.message);
  }
};