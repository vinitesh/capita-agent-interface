# Design Document

## Overview

This document describes the technical design for the Real-Time A2A Chat Client. The system is a full-stack containerized application with a React frontend and Node.js backend that communicates with A2A-compliant agent servers. It supports synchronous JSON-RPC message exchange, real-time webhook-based progress updates via Socket.io, DynamoDB-backed chat persistence, and conversation resumption.

## Architecture

### High-Level Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│                  │     │                      │     │                 │
│  React Frontend  │◄───►│  Node.js Backend     │◄───►│  A2A Server     │
│  (Vite + nginx)  │     │  (Express + Socket.io)│     │  (External)     │
│  Port 80         │     │  Port 3001           │     │                 │
│                  │     │                      │     └─────────────────┘
└─────────────────┘     │                      │
        ▲                │                      │     ┌─────────────────┐
        │ Socket.io      │                      │◄────│  MCP Server     │
        └────────────────┤                      │     │  (Webhooks)     │
                         │                      │     └─────────────────┘
                         │                      │
                         │                      │     ┌─────────────────┐
                         │                      │◄───►│  DynamoDB       │
                         │                      │     │  (Chat Storage) │
                         └──────────────────────┘     └─────────────────┘
```

### Directory Structure

```
/a2a-client
├── /frontend
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.js
│   └── /src
│       ├── main.jsx
│       ├── App.jsx
│       ├── App.css
│       ├── /components
│       │   ├── Sidebar.jsx
│       │   ├── ChatArea.jsx
│       │   ├── MessageList.jsx
│       │   ├── MessageInput.jsx
│       │   ├── StatusIndicator.jsx
│       │   └── SessionList.jsx
│       ├── /hooks
│       │   ├── useSocket.js
│       │   └── useChatState.js
│       └── /services
│           └── api.js
├── /backend
│   ├── Dockerfile
│   ├── package.json
│   └── /src
│       ├── server.js
│       ├── /routes
│       │   ├── discover.js
│       │   ├── message.js
│       │   ├── webhook.js
│       │   └── sessions.js
│       ├── /services
│       │   ├── a2aClient.js
│       │   └── dynamodb.js
│       └── /socket
│           └── handler.js
└── docker-compose.yml
```

## Components

### Backend Components

#### 1. Express Server (`server.js`)
- Initializes Express with `cors()` middleware (origin set to Frontend URL) and `express.json()` parser
- Creates HTTP server, attaches Socket.io with CORS configuration
- Registers route handlers for `/api/discover`, `/api/message`, `/webhook`, `/api/sessions`
- Initializes Socket.io event handler
- Listens on port 3001 (configurable via `PORT` env var)

#### 2. Socket.io Handler (`socket/handler.js`)
- Exports a function that accepts the `io` instance
- Listens for `connection` events
- On `join_room` event: extracts `contextId`, calls `socket.join(contextId)`
- On `disconnect`: Socket.io automatically handles room cleanup

#### 3. Discovery Route (`routes/discover.js`)
- `POST /api/discover`
- Validates `agentUrl` is present in request body
- Uses axios to GET `${agentUrl}/.well-known/agent.json`
- Returns the Agent Card JSON on success
- Returns 502 with error message on upstream failure, 400 on missing input

#### 4. Message Route (`routes/message.js`)
- `POST /api/message`
- Validates required fields: `agentUrl`, `contextId`, `userText`
- Delegates to `a2aClient.sendMessage()` to construct and send JSON-RPC payload
- On success: calls `dynamodb.saveMessages()` to persist the exchange, then returns `{ text, state, taskId }`
- On A2A failure: returns 502 with error details
- On DynamoDB failure: logs error, still returns A2A response to client

#### 5. Webhook Route (`routes/webhook.js`)
- `POST /webhook`
- Validates `contextId` is present in body
- Emits `progress_update` event to `io.to(contextId)` with the `status` value
- Returns 200 immediately
- Returns 400 if `contextId` is missing

#### 6. Sessions Route (`routes/sessions.js`)
- `GET /api/sessions` — calls `dynamodb.listSessions()`, returns sorted session summaries
- `GET /api/sessions/:contextId` — calls `dynamodb.getSession(contextId)`, returns full session or 404

#### 7. A2A Client Service (`services/a2aClient.js`)
- `sendMessage({ agentUrl, contextId, taskId, userText })` — constructs JSON-RPC 2.0 payload:
  ```json
  {
    "jsonrpc": "2.0",
    "method": "sendMessage",
    "id": "<uuid-v4>",
    "params": {
      "contextId": "<contextId>",
      "taskId": "<taskId-if-present>",
      "message": {
        "role": "user",
        "parts": [{ "type": "text", "text": "<userText>" }]
      }
    }
  }
  ```
- Sends POST to `agentUrl` via axios
- Parses response to extract: agent text (from `result.message.parts[0].text`), task state (`result.state`), task ID (`result.taskId`)
- Returns `{ text, state, taskId }`

#### 8. DynamoDB Service (`services/dynamodb.js`)
- Uses AWS SDK v3 (`@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb`)
- Table name from `DYNAMODB_TABLE` env var (default: `a2a-chat-sessions`)
- `saveMessages({ contextId, agentUrl, agentName, userMessage, agentMessage, activeTaskId, isInputRequired })`:
  - Uses `UpdateExpression` to append messages and update metadata
  - Sets `createdAt` on first write (using `if_not_exists`), always updates `updatedAt`
- `listSessions()`:
  - Scans table, projects `contextId`, `agentName`, `updatedAt`, `messages`
  - Sorts by `updatedAt` descending in application code
  - Returns summaries with last message preview (last element of messages array)
- `getSession(contextId)`:
  - GetItem by `contextId` partition key
  - Returns full session record or null

### Frontend Components

#### 9. API Service (`services/api.js`)
- Base URL from `VITE_API_URL` env var (e.g., `http://localhost:3001`)
- `discoverAgent(agentUrl)` — POST to `/api/discover`
- `sendMessage({ agentUrl, contextId, userText, taskId })` — POST to `/api/message`
- `listSessions()` — GET to `/api/sessions`
- `getSession(contextId)` — GET to `/api/sessions/:contextId`
- All methods use fetch or axios, return parsed JSON

#### 10. Socket Hook (`hooks/useSocket.js`)
- Custom React hook that manages Socket.io connection lifecycle
- `connect(contextId)` — creates socket connection, emits `join_room`
- Listens for `progress_update` events, calls provided callback
- `disconnect()` — cleans up socket connection
- Returns `{ connect, disconnect }` interface

#### 11. Chat State Hook (`hooks/useChatState.js`)
- Custom React hook managing all chat-related state:
  - `agentUrl` (string, default null)
  - `contextId` (string, default null)
  - `messages` (array, default [])
  - `agentStatus` (string, default null)
  - `activeTaskId` (string, default null)
  - `isInputRequired` (boolean, default false)
  - `agentCard` (object, default null)
  - `sessions` (array, default [])
- Exposes action functions: `setAgentUrl`, `addMessage`, `setAgentStatus`, `setActiveTask`, `resetInputRequired`, `restoreSession`, `setSessions`

#### 12. App Component (`App.jsx`)
- Root component, renders Sidebar and ChatArea side by side
- Initializes `useChatState` and `useSocket` hooks
- Passes state and handlers down to child components

#### 13. Sidebar Component (`components/Sidebar.jsx`)
- Renders URL input, Connect button, agent info panel, and SessionList
- On Connect: calls `api.discoverAgent()`, on success generates UUIDv4 contextId, calls `socket.connect(contextId)`, updates state
- On error: displays error message

#### 14. Session List Component (`components/SessionList.jsx`)
- Fetches sessions via `api.listSessions()` on mount
- Renders list of past sessions with agent name, timestamp, last message preview
- On session click: calls `api.getSession(contextId)`, restores full state, reconnects socket

#### 15. Chat Area Component (`components/ChatArea.jsx`)
- Renders MessageList, StatusIndicator, and MessageInput
- Passes relevant state and handlers

#### 16. Message List Component (`components/MessageList.jsx`)
- Renders scrollable list of messages
- Applies different CSS classes for `user` vs `agent` role messages
- Auto-scrolls to bottom on new messages using `useEffect` + `scrollIntoView`

#### 17. Status Indicator Component (`components/StatusIndicator.jsx`)
- Conditionally renders when `agentStatus` is non-null
- Displays formatted status text (e.g., "⏳ Agent is: calling salesforce")

#### 18. Message Input Component (`components/MessageInput.jsx`)
- Text input + Send button
- When `isInputRequired` is true: applies highlight CSS class, changes placeholder to "Agent needs more info..."
- On submit: calls parent handler which appends message, calls API, processes response

### Data Model

#### DynamoDB Table: `a2a-chat-sessions`

| Attribute | Type | Description |
|-----------|------|-------------|
| `contextId` (PK) | String | UUIDv4 partition key |
| `agentUrl` | String | URL of the connected A2A server |
| `agentName` | String | Name from Agent Card |
| `messages` | List | Array of `{ role, text, timestamp }` objects |
| `activeTaskId` | String | Current paused task ID (nullable) |
| `isInputRequired` | Boolean | Whether agent awaits input |
| `createdAt` | String | ISO 8601 timestamp of session creation |
| `updatedAt` | String | ISO 8601 timestamp of last update |

### Docker Configuration

#### Backend Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3001
CMD ["node", "src/server.js"]
```

#### Frontend Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### docker-compose.yml
```yaml
version: '3.8'
services:
  api:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - DYNAMODB_TABLE=a2a-chat-sessions
      - AWS_REGION=us-east-1
    networks:
      - app-network

  web:
    build:
      context: ./frontend
      args:
        VITE_API_URL: http://localhost:3001
    ports:
      - "80:80"
    depends_on:
      - api
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

## Correctness Properties

### Property 1: JSON-RPC Payload Construction Integrity (Req 4, AC 1-2)
For any valid combination of `agentUrl`, `contextId`, `userText`, and optional `taskId`, the constructed JSON_RPC_Payload SHALL:
- Have `jsonrpc` field equal to `"2.0"`
- Have `method` field equal to `"sendMessage"`
- Have `id` field as a valid UUIDv4
- Have `params.contextId` matching the input `contextId`
- Have `params.message.role` equal to `"user"`
- Have `params.message.parts[0].text` matching the input `userText`
- Include `params.taskId` if and only if `taskId` was provided in the input

### Property 2: Webhook Room Routing Isolation (Req 2 AC 2, Req 5 AC 1)
For any two distinct Context_IDs, when a webhook is received for one Context_ID, only sockets in the Socket_Room matching that Context_ID SHALL receive the `progress_update` event. Sockets in other rooms SHALL NOT receive the event.

### Property 3: A2A Response Parsing Consistency (Req 4, AC 4)
For any valid A2A server response, the Backend SHALL extract and return a response object where:
- `text` is a non-empty string extracted from the response message parts
- `state` is either `"completed"` or `"input-required"`
- `taskId` is a string identifier from the response

### Property 4: Chat Session Persistence Completeness (Req 15, AC 2-4)
For any sequence of message exchanges within a conversation:
- The DynamoDB record SHALL contain all user and agent messages in chronological order
- The `messages` array length SHALL equal twice the number of successful exchanges (one user + one agent per exchange)
- The `updatedAt` timestamp SHALL be greater than or equal to `createdAt`
- The `contextId`, `agentUrl`, and `agentName` fields SHALL be present and non-empty

### Property 5: Session List Ordering (Req 16, AC 1)
For any set of Chat_Sessions in DynamoDB, the `GET /api/sessions` response SHALL return sessions sorted by `updatedAt` in strictly descending order. For all adjacent pairs (i, i+1) in the returned list, `sessions[i].updatedAt >= sessions[i+1].updatedAt`.

### Property 6: Chat State Restoration Completeness (Req 17, AC 3)
For any persisted Chat_Session, when restored in the Frontend, the application state SHALL match the persisted record:
- `messages` array SHALL contain the same elements in the same order
- `activeTaskId` SHALL match the persisted value
- `isInputRequired` SHALL match the persisted value
- `agentUrl` SHALL match the persisted value
- `contextId` SHALL match the persisted value

### Property 7: Message Array Monotonic Growth (Req 8, AC 1, 3)
For any sequence of user submissions and agent responses, the `messages` array length SHALL monotonically increase. Each user submission adds exactly one element, and each successful agent response adds exactly one element. No operation SHALL remove or reorder existing messages.

### Property 8: Input-Required State Machine Consistency (Req 8, AC 5-7; Req 10)
The `isInputRequired` and `activeTaskId` states SHALL follow these transitions:
- When response state is `input-required`: `isInputRequired` becomes `true`, `activeTaskId` is set to the returned Task_ID
- When response state is `completed`: `activeTaskId` becomes `null`
- When user submits a message: `isInputRequired` becomes `false`
- `isInputRequired` SHALL be `true` only when `activeTaskId` is non-null

## Error Handling

### Backend Error Handling
- Discovery failures (network errors, non-200 responses): Return HTTP 502 with descriptive error message
- Message sending failures: Return HTTP 502 with A2A server error details
- Invalid request bodies (missing required fields): Return HTTP 400 with field-specific error messages
- DynamoDB write failures: Log error, return A2A response normally (non-blocking)
- DynamoDB read failures: Return HTTP 500 with generic error message

### Frontend Error Handling
- Discovery failures: Display error message in sidebar, do not generate contextId
- Message sending failures: Display error in chat area, preserve existing state
- Socket.io disconnection: Attempt automatic reconnection (Socket.io default behavior)
- Session retrieval failures: Display error message, remain on current view
