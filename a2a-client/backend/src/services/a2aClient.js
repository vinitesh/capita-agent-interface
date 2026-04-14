const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * Sends a message to an A2A-compliant agent server via JSON-RPC 2.0.
 * Supports both v0.3 (kind-based) and v1.0 (member-name-based) response formats.
 *
 * Per the A2A spec:
 * - SendMessage returns a Task or Message in result
 * - Task has: id, contextId, status (state + optional message), artifacts
 * - For multi-turn: taskId goes in the message object, contextId in params
 * - Parts use { kind: "text", text: "..." } format in v0.3
 */
async function sendMessage({ agentUrl, contextId, taskId, userText, webhookContextId }) {
  const messageId = `msg-${Date.now()}-${uuidv4().slice(0, 10)}`;

  // Append webhook context ID to the message so the agent's MCP tools can post updates
  const textWithContext = webhookContextId
    ? `${userText}\n\nNOTE: For any tool requesting a context id please pass ${webhookContextId}`
    : userText;

  // Build the message per A2A spec Section 4.1.4
  const message = {
    kind: 'message',
    messageId,
    role: 'user',
    parts: [{ kind: 'text', text: textWithContext }],
  };

  // For follow-ups: contextId and taskId go INSIDE the message object
  if (taskId) {
    message.taskId = taskId;
  }
  if (taskId && contextId) {
    message.contextId = contextId;
  }

  // Build SendMessageRequest per spec Section 3.2.1
  const params = {
    message,
  };

  // Always pass contextId at params level when we have a server-assigned one
  // This ensures the A2A server continues the same conversation context
  if (contextId) {
    params.contextId = contextId;
  }

  const payload = {
    jsonrpc: '2.0',
    id: messageId,
    method: 'message/send',
    params,
  };

  console.error('Sending A2A payload:', JSON.stringify(payload, null, 2));
  const response = await axios.post(agentUrl, payload);
  console.error('A2A response:', JSON.stringify(response.data, null, 2));

  return parseA2AResponse(response.data, contextId);
}

/**
 * Parse A2A JSON-RPC response.
 * Per spec Section 9.4.1, result contains either:
 *   - { task: { Task } }  (v1.0 wrapper)
 *   - A Task object directly (v0.3 style, has "id", "status", etc.)
 *   - { message: { Message } } for simple responses
 */
function parseA2AResponse(data, fallbackContextId) {
  const result = data.result;
  if (!result) {
    throw new Error('No result in A2A response');
  }

  // Determine if result is a Task (has status field) or wrapped
  const task = result.task || (result.status ? result : null);
  const directMessage = result.message && !result.status ? result.message : null;

  if (directMessage) {
    // Simple message response (no task tracking)
    return {
      text: extractTextFromParts(directMessage.parts),
      state: 'completed',
      taskId: null,
      contextId: directMessage.contextId || fallbackContextId,
    };
  }

  if (task) {
    // Task response — extract text from status.message or artifacts
    let text = '';

    // 1. Check status.message (used for input-required, working states)
    if (task.status?.message?.parts) {
      text = extractTextFromParts(task.status.message.parts);
    }

    // 2. Fall back to artifacts (used for completed tasks with output)
    if (!text && task.artifacts?.length > 0) {
      for (const artifact of task.artifacts) {
        if (artifact.parts) {
          const artifactText = extractTextFromParts(artifact.parts);
          if (artifactText) {
            text = text ? `${text}\n${artifactText}` : artifactText;
          }
        }
      }
    }

    if (!text) {
      text = '[No text content in response]';
    }

    // Extract state from status per spec Section 4.1.2/4.1.3
    const state = normalizeState(task.status?.state);

    return {
      text,
      state,
      taskId: task.id,
      contextId: task.contextId || fallbackContextId,
    };
  }

  // Fallback: try to extract whatever we can
  return {
    text: JSON.stringify(result),
    state: 'completed',
    taskId: null,
    contextId: fallbackContextId,
  };
}

/**
 * Extract text from an array of Part objects.
 * Supports both v0.3 ({ kind: "text", text: "..." }) and v1.0 ({ text: "..." }) formats.
 */
function extractTextFromParts(parts) {
  if (!parts || !Array.isArray(parts)) return '';

  const texts = parts
    .filter(p => p.text != null) // Works for both { kind: "text", text } and { text }
    .map(p => p.text);

  return texts.join('\n');
}

/**
 * Normalize task state values.
 * v0.3 uses lowercase like "input-required", "completed"
 * v1.0 uses SCREAMING_SNAKE like "TASK_STATE_INPUT_REQUIRED"
 */
function normalizeState(state) {
  if (!state) return 'completed';

  const s = state.toLowerCase().replace('task_state_', '');

  if (s === 'input_required' || s === 'input-required') return 'input-required';
  if (s === 'completed') return 'completed';
  if (s === 'failed') return 'failed';
  if (s === 'canceled' || s === 'cancelled') return 'canceled';
  if (s === 'working' || s === 'submitted') return 'working';
  if (s === 'auth_required' || s === 'auth-required') return 'auth-required';
  if (s === 'rejected') return 'rejected';

  return state;
}

module.exports = { sendMessage };
