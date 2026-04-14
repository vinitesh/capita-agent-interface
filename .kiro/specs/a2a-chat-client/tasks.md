# Implementation Tasks

## Task 1: Project Scaffolding and Configuration
- [x] 1.1 Create the `/a2a-client` root directory with `/frontend` and `/backend` subdirectories
- [x] 1.2 Initialize `/backend/package.json` with dependencies: express, cors, socket.io, axios, uuid, @aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb
- [x] 1.3 Initialize `/frontend/package.json` with Vite + React, dependencies: socket.io-client, uuid
- [x] 1.4 Create `/frontend/vite.config.js` with environment variable support for `VITE_API_URL`

## Task 2: Backend Server Initialization (Req 1, 2)
- [x] 2.1 Create `backend/src/server.js` — initialize Express with CORS and JSON parsing middleware, create HTTP server, attach Socket.io with CORS config, register route handlers, listen on port 3001
- [x] 2.2 Create `backend/src/socket/handler.js` — export function accepting `io` instance, handle `connection`, `join_room` (socket.join with contextId), and `disconnect` events

## Task 3: A2A Client Service (Req 4)
- [x] 3.1 Create `backend/src/services/a2aClient.js` — implement `sendMessage({ agentUrl, contextId, taskId, userText })` that constructs JSON-RPC 2.0 payload with uuid, sends POST via axios, parses response to extract `{ text, state, taskId }`

## Task 4: DynamoDB Service (Req 15, 16)
- [x] 4.1 Create `backend/src/services/dynamodb.js` — initialize DynamoDB Document Client with AWS SDK v3, configure table name from `DYNAMODB_TABLE` env var
- [x] 4.2 Implement `saveMessages({ contextId, agentUrl, agentName, userMessage, agentMessage, activeTaskId, isInputRequired })` — use UpdateExpression to append messages, set createdAt with if_not_exists, update updatedAt
- [x] 4.3 Implement `listSessions()` — scan table, project summary fields, sort by updatedAt descending, return summaries with last message preview
- [x] 4.4 Implement `getSession(contextId)` — GetItem by contextId, return full record or null

## Task 5: Backend API Routes (Req 3, 4, 5, 16)
- [x] 5.1 Create `backend/src/routes/discover.js` — POST /api/discover, validate agentUrl, GET agent.json from A2A server, return Agent Card or error
- [x] 5.2 Create `backend/src/routes/message.js` — POST /api/message, validate fields, call a2aClient.sendMessage(), persist via dynamodb.saveMessages(), return response (log and continue on DynamoDB failure)
- [x] 5.3 Create `backend/src/routes/webhook.js` — POST /webhook, validate contextId, emit progress_update to Socket.io room, return 200
- [x] 5.4 Create `backend/src/routes/sessions.js` — GET /api/sessions (list summaries), GET /api/sessions/:contextId (full session or 404)

## Task 6: Frontend API Service and Hooks (Req 11)
- [x] 6.1 Create `frontend/src/services/api.js` — implement discoverAgent, sendMessage, listSessions, getSession functions using fetch with VITE_API_URL base
- [x] 6.2 Create `frontend/src/hooks/useSocket.js` — custom hook managing Socket.io connection, join_room emission, progress_update listener, disconnect cleanup
- [x] 6.3 Create `frontend/src/hooks/useChatState.js` — custom hook with all state variables (agentUrl, contextId, messages, agentStatus, activeTaskId, isInputRequired, agentCard, sessions) and action functions

## Task 7: Frontend UI Components — Sidebar (Req 6, 17)
- [x] 7.1 Create `frontend/src/components/Sidebar.jsx` — URL input, Connect button, agent info panel; on Connect: call discoverAgent, generate contextId, connect socket
- [x] 7.2 Create `frontend/src/components/SessionList.jsx` — fetch and display past sessions, on click: restore full session state and reconnect socket

## Task 8: Frontend UI Components — Chat Area (Req 7, 8, 9, 10)
- [x] 8.1 Create `frontend/src/components/ChatArea.jsx` — container rendering MessageList, StatusIndicator, and MessageInput
- [x] 8.2 Create `frontend/src/components/MessageList.jsx` — scrollable message list with user/agent styling, auto-scroll on new messages
- [x] 8.3 Create `frontend/src/components/StatusIndicator.jsx` — conditional render when agentStatus is non-null, display formatted status text
- [x] 8.4 Create `frontend/src/components/MessageInput.jsx` — text input + Send button, highlight and placeholder change when isInputRequired is true, submit handler

## Task 9: Frontend App Assembly (Req 6-11)
- [x] 9.1 Create `frontend/src/App.jsx` and `frontend/src/App.css` — root component composing Sidebar and ChatArea, initialize hooks, wire state and handlers
- [x] 9.2 Create `frontend/src/main.jsx` — React entry point rendering App

## Task 10: Docker Configuration (Req 12, 13, 14)
- [x] 10.1 Create `backend/Dockerfile` — node:18-alpine, copy package files, npm ci --only=production, copy src, expose 3001, CMD node src/server.js
- [x] 10.2 Create `frontend/Dockerfile` — multi-stage: Node build with VITE_API_URL arg, nginx:alpine serve stage, expose 80
- [x] 10.3 Create `frontend/nginx.conf` — configure nginx to serve static files and handle SPA routing
- [x] 10.4 Create `docker-compose.yml` — define api and web services, port mappings (3001, 80), environment variables, app-network bridge
