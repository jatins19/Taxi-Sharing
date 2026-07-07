const express = require('express');
const { pool } = require('../server');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Submit rating
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { rideId, ratedUserId, rating, comment } = req.body;
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const connection = await pool.getConnection();
    await connection.execute(
      `INSERT INTO ratings (ride_id, from_user_id, to_user_id, rating, comment, created_at) 
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [rideId, req.userId, ratedUserId, rating, comment]
    );

    // Update user's average rating
    const [ratingResult] = await connection.execute(
      'SELECT AVG(rating) as avg_rating FROM ratings WHERE to_user_id = ?',
      [ratedUserId]
    );
    
    await connection.execute(
      'UPDATE users SET rating = ? WHERE id = ?',
      [ratingResult[0].avg_rating, ratedUserId]
    );
    
    connection.release();

    res.status(201).json({ message: 'Rating submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// Get user ratings
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM ratings WHERE to_user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    connection.release();

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

module.exports = router;