const express = require('express');
const { createUser, listUsers, deleteUser } = require('../services/userService');

const router = express.Router();

// GET / — list all users
router.get('/', async (req, res) => {
  try {
    const users = await listUsers();
    res.json(users);
  } catch (error) {
    console.error('List users error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / — create a new user
router.post('/', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await createUser({ username, password, role });
    res.status(201).json(user);
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    console.error('Create user error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:username — delete a user (prevent self-deletion)
router.delete('/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const currentUser = req.body.currentUser || req.query.currentUser;

    if (currentUser && currentUser === username) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await deleteUser(username);
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
