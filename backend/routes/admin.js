const express = require('express');
const { pool } = require('../server');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

const router = express.Router();

// Get dashboard stats
router.get('/dashboard', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    const [totalUsers] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const [totalRides] = await connection.execute('SELECT COUNT(*) as count FROM rides');
    const [totalRevenue] = await connection.execute('SELECT SUM(amount) as total FROM payments WHERE status = "completed"');
    const [activeRides] = await connection.execute('SELECT COUNT(*) as count FROM rides WHERE status = "in_progress"');
    
    connection.release();

    res.json({
      totalUsers: totalUsers[0].count,
      totalRides: totalRides[0].count,
      totalRevenue: totalRevenue[0].total || 0,
      activeRides: activeRides[0].count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Get all users
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT id, name, email, phone, user_type, rating, created_at FROM users');
    connection.release();

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get all rides
router.get('/rides', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute('SELECT * FROM rides ORDER BY created_at DESC');
    connection.release();

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
});

module.exports = router;