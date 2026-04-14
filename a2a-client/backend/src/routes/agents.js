const express = require('express');
const dynamodb = require('../services/dynamodb');

const router = express.Router();

// GET / — List all previously connected agents
router.get('/', async (req, res) => {
  try {
    const agents = await dynamodb.listAgents();
    return res.status(200).json(agents);
  } catch (err) {
    console.error('Failed to list agents:', err);
    return res.status(500).json({ error: 'Failed to retrieve agents' });
  }
});

module.exports = router;
