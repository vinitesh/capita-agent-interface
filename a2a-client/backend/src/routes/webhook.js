const express = require('express');

// Factory function — accepts Socket.io instance and returns an Express Router
function createWebhookRouter(io) {
  const router = express.Router();

  // POST / — Receive webhook progress updates and broadcast to the correct room
  router.post('/', (req, res) => {
    const { contextId, status } = req.body;

    if (!contextId) {
      return res.status(400).json({ error: 'contextId is required' });
    }

    io.to(contextId).emit('progress_update', { status });

    return res.status(200).json({ ok: true });
  });

  return router;
}

module.exports = createWebhookRouter;
