const express = require('express');
const { pool } = require('../server');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT id, name, email, phone, user_type, profile_pic, rating, created_at FROM users WHERE id = ?',
      [req.userId]
    );
    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, profilePic } = req.body;
    
    const connection = await pool.getConnection();
    await connection.execute(
      'UPDATE users SET name = ?, phone = ?, profile_pic = ? WHERE id = ?',
      [name, phone, profilePic, req.userId]
    );
    connection.release();

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get nearby drivers
router.get('/drivers/nearby', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;
    
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT id, name, phone, rating, vehicle_info, current_latitude, current_longitude 
       FROM users 
       WHERE user_type = 'driver' 
       AND is_available = true 
       AND (6371 * acos(cos(radians(?)) * cos(radians(current_latitude)) * cos(radians(?) - radians(current_longitude)) + sin(radians(?)) * sin(radians(current_latitude)))) < ?
       ORDER BY rating DESC`,
      [latitude, longitude, latitude, radius || 5]
    );
    connection.release();

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch nearby drivers' });
  }
});

module.exports = router;