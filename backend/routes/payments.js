const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { pool } = require('../server');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Create payment intent
router.post('/create-intent', authMiddleware, async (req, res) => {
  try {
    const { amount, rideId } = req.body;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      metadata: { rideId }
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Confirm payment
router.post('/confirm', authMiddleware, async (req, res) => {
  try {
    const { rideId, amount, paymentIntentId } = req.body;
    
    const connection = await pool.getConnection();
    await connection.execute(
      `INSERT INTO payments (ride_id, user_id, amount, payment_method, status, created_at) 
       VALUES (?, ?, ?, 'stripe', 'completed', NOW())`,
      [rideId, req.userId, amount]
    );
    connection.release();

    res.json({ message: 'Payment successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Payment failed' });
  }
});

// Get payment history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    connection.release();

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

module.exports = router;