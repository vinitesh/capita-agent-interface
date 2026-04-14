require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const initializeSocket = require('./socket/handler');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Route handlers
const discoverRouter = require('./routes/discover');
const messageRouter = require('./routes/message');
const webhookRouter = require('./routes/webhook');
const sessionsRouter = require('./routes/sessions');
const agentsRouter = require('./routes/agents');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');

app.use('/api/discover', discoverRouter);
app.use('/api/message', messageRouter);
app.use('/webhook', webhookRouter(io));
app.use('/api/sessions', sessionsRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

// Initialize Socket.io event handler
initializeSocket(io);

const PORT = process.env.PORT || 3001;
const { seedDefaultAdmin } = require('./services/seedAdmin');

server.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
  seedDefaultAdmin();
});

module.exports = { app, server, io };
