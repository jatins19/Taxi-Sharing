const express = require('express');
const { pool, io } = require('../server');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Request a ride
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { pickupLocation, dropoffLocation, pickupLat, pickupLng, dropoffLat, dropoffLng, estimatedFare } = req.body;
    
    const connection = await pool.getConnection();
    const [result] = await connection.execute(
      `INSERT INTO rides (passenger_id, pickup_location, dropoff_location, pickup_lat, pickup_lng, 
       dropoff_lat, dropoff_lng, estimated_fare, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'requested', NOW())`,
      [req.userId, pickupLocation, dropoffLocation, pickupLat, pickupLng, dropoffLat, dropoffLng, estimatedFare]
    );
    connection.release();

    io.emit('new_ride_request', {
      rideId: result.insertId,
      passengerId: req.userId,
      pickupLocation,
      dropoffLocation,
      estimatedFare
    });

    res.status(201).json({ rideId: result.insertId, message: 'Ride requested successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to request ride' });
  }
});

// Accept ride
router.post('/:rideId/accept', authMiddleware, async (req, res) => {
  try {
    const { rideId } = req.params;
    
    const connection = await pool.getConnection();
    await connection.execute(
      'UPDATE rides SET driver_id = ?, status = ? WHERE id = ?',
      [req.userId, 'accepted', rideId]
    );
    connection.release();

    io.emit('ride_accepted', { rideId, driverId: req.userId });

    res.json({ message: 'Ride accepted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to accept ride' });
  }
});

// Update ride status
router.put('/:rideId/status', authMiddleware, async (req, res) => {
  try {
    const { rideId } = req.params;
    const { status } = req.body;
    
    const connection = await pool.getConnection();
    await connection.execute(
      'UPDATE rides SET status = ? WHERE id = ?',
      [status, rideId]
    );
    connection.release();

    io.emit('ride_status_updated', { rideId, status });

    res.json({ message: 'Ride status updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update ride status' });
  }
});

// Get ride history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.execute(
      `SELECT * FROM rides 
       WHERE passenger_id = ? OR driver_id = ? 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [req.userId, req.userId]
    );
    connection.release();

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch ride history' });
  }
});

module.exports = router;