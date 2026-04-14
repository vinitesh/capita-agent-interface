const express = require('express');
const axios = require('axios');
const dynamodb = require('../services/dynamodb');

const router = express.Router();

// POST / — Discover an A2A agent by fetching its Agent Card
router.post('/', async (req, res) => {
  const { agentUrl } = req.body;

  if (!agentUrl) {
    return res.status(400).json({ error: 'agentUrl is required' });
  }

  try {
    let response;
    try {
      response = await axios.get(`${agentUrl}/.well-known/agent.json`);
    } catch {
      response = await axios.get(`${agentUrl}/.well-known/agent-card.json`);
    }
    const card = response.data;

    // Save agent to history (non-blocking)
    try {
      await dynamodb.saveAgent({
        agentUrl: card.url || agentUrl,
        agentName: card.name,
        description: card.description,
        skills: (card.skills || []).map(s => s.name || s),
      });
    } catch (err) {
      console.error('Failed to save agent history:', err);
    }

    return res.status(200).json(card);
  } catch (err) {
    return res.status(502).json({
      error: 'Failed to fetch Agent Card from upstream server',
      details: err.message,
    });
  }
});

module.exports = router;
