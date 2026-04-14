const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const USERS_TABLE = process.env.USERS_TABLE || 'a2a-users';

async function createUser({ username, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const createdAt = new Date().toISOString();

  const command = new PutCommand({
    TableName: USERS_TABLE,
    Item: { username, passwordHash, role: role || 'user', createdAt },
    ConditionExpression: 'attribute_not_exists(username)',
  });

  await docClient.send(command);
  return { username, role: role || 'user', createdAt };
}

async function getUserByUsername(username) {
  const command = new GetCommand({
    TableName: USERS_TABLE,
    Key: { username },
  });

  const result = await docClient.send(command);
  return result.Item || null;
}

async function listUsers() {
  const command = new ScanCommand({
    TableName: USERS_TABLE,
    ProjectionExpression: 'username, #r, createdAt',
    ExpressionAttributeNames: { '#r': 'role' },
  });

  const result = await docClient.send(command);
  return result.Items || [];
}

async function deleteUser(username) {
  const command = new DeleteCommand({
    TableName: USERS_TABLE,
    Key: { username },
  });

  await docClient.send(command);
}

module.exports = { createUser, getUserByUsername, listUsers, deleteUser };
