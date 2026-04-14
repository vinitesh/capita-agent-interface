const express = require('express');
const a2aClient = require('../services/a2aClient');
const dynamodb = require('../services/dynamodb');

const router = express.Router();

// POST / — Send a message to an A2A agent and persist the exchange
router.post('/', async (req, res) => {
  const { agentUrl, contextId, userText, taskId, agentName, webhookContextId } = req.body;

  if (!agentUrl || !contextId || !userText) {
    return res.status(400).json({
      error: 'agentUrl, contextId, and userText are required',
    });
  }

  let result;
  try {
    result = await a2aClient.sendMessage({ agentUrl, contextId, taskId, userText, webhookContextId });
  } catch (err) {
    console.error('A2A sendMessage error:', err.response?.status, err.response?.data || err.message);
    return res.status(502).json({
      error: 'Failed to communicate with A2A server',
      details: err.response?.data || err.message,
    });
  }

  // Persist the exchange to DynamoDB using webhookContextId as the session key
  try {
    await dynamodb.saveMessages({
      contextId: webhookContextId || contextId,
      agentUrl,
      agentName: agentName || 'Unknown Agent',
      userMessage: userText,
      agentMessage: result.text,
      activeTaskId: result.state === 'input-required' ? result.taskId : null,
      isInputRequired: result.state === 'input-required',
    });
  } catch (err) {
    console.error('DynamoDB save failed:', err);
  }

  return res.status(200).json({
    text: result.text,
    state: result.state,
    taskId: result.taskId,
    contextId: result.contextId,
  });
});

module.exports = router;
