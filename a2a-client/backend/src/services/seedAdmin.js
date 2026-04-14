const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { createUser } = require('./userService');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const USERS_TABLE = process.env.USERS_TABLE || 'a2a-users';

async function seedDefaultAdmin() {
  try {
    const command = new ScanCommand({
      TableName: USERS_TABLE,
      Limit: 1,
    });

    const result = await docClient.send(command);

    if (!result.Items || result.Items.length === 0) {
      await createUser({ username: 'admin', password: 'admin', role: 'admin' });
      console.log('Default admin user created');
    } else {
      console.log('Users already exist, skipping seed');
    }
  } catch (error) {
    console.error('Error seeding default admin:', error.message);
  }
}

module.exports = { seedDefaultAdmin };
