const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  UpdateCommand,
  ScanCommand,
  GetCommand,
  PutCommand,
} = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB Document Client
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'a2a-chat-sessions';
const AGENT_HISTORY_TABLE = process.env.AGENT_HISTORY_TABLE || 'a2a-agent-history';

// 4.2 — Save messages to a session (append-style upsert)
async function saveMessages({
  contextId,
  agentUrl,
  agentName,
  userMessage,
  agentMessage,
  activeTaskId,
  isInputRequired,
}) {
  const now = new Date().toISOString();

  const userMsg = { role: 'user', text: userMessage, timestamp: now };
  const agentMsg = { role: 'agent', text: agentMessage, timestamp: now };

  const command = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { contextId },
    UpdateExpression:
      'SET messages = list_append(if_not_exists(messages, :empty), :newMessages), ' +
      'createdAt = if_not_exists(createdAt, :now), ' +
      'updatedAt = :now, ' +
      'agentUrl = :agentUrl, ' +
      'agentName = :agentName, ' +
      'activeTaskId = :activeTaskId, ' +
      'isInputRequired = :isInputRequired',
    ExpressionAttributeValues: {
      ':empty': [],
      ':newMessages': [userMsg, agentMsg],
      ':now': now,
      ':agentUrl': agentUrl,
      ':agentName': agentName,
      ':activeTaskId': activeTaskId || null,
      ':isInputRequired': !!isInputRequired,
    },
  });

  await docClient.send(command);
}

// 4.3 — List all sessions with summary info
async function listSessions() {
  const command = new ScanCommand({
    TableName: TABLE_NAME,
    ProjectionExpression: 'contextId, agentName, updatedAt, messages',
  });

  const result = await docClient.send(command);
  const items = result.Items || [];

  // Sort by updatedAt descending
  items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));

  return items.map((item) => {
    const messages = item.messages || [];
    const last = messages.length > 0 ? messages[messages.length - 1] : null;

    return {
      contextId: item.contextId,
      agentName: item.agentName,
      updatedAt: item.updatedAt,
      lastMessage: last ? last.text : null,
    };
  });
}

// Get a full session by contextId
async function getSession(contextId) {
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: { contextId },
  });

  const result = await docClient.send(command);
  return result.Item || null;
}

// Save an agent to connection history
async function saveAgent({ agentUrl, agentName, description, skills }) {
  const now = new Date().toISOString();
  const command = new PutCommand({
    TableName: AGENT_HISTORY_TABLE,
    Item: {
      agentUrl,
      agentName: agentName || 'Unknown Agent',
      description: description || '',
      skills: skills || [],
      lastConnected: now,
    },
  });
  await docClient.send(command);
}

// List all previously connected agents
async function listAgents() {
  const command = new ScanCommand({
    TableName: AGENT_HISTORY_TABLE,
  });
  const result = await docClient.send(command);
  const items = result.Items || [];
  items.sort((a, b) => (b.lastConnected || '').localeCompare(a.lastConnected || ''));
  return items;
}

module.exports = { saveMessages, listSessions, getSession, saveAgent, listAgents };
