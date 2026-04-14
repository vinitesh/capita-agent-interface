const express = require('express');
const dynamodb = require('../services/dynamodb');

const router = express.Router();

// GET / — List all session summaries
router.get('/', async (req, res) => {
  try {
    const sessions = await dynamodb.listSessions();
    return res.status(200).json(sessions);
  } catch (err) {
    console.error('Failed to list sessions:', err);
    return res.status(500).json({ error: 'Failed to retrieve sessions' });
  }
});

// GET /:contextId — Get a full session by contextId
router.get('/:contextId', async (req, res) => {
  try {
    const session = await dynamodb.getSession(req.params.contextId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    return res.status(200).json(session);
  } catch (err) {
    console.error('Failed to get session:', err);
    return res.status(500).json({ error: 'Failed to retrieve session' });
  }
});

module.exports = router;
