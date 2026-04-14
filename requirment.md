Markdown
# Master Specification: Real-Time A2A Chat Client

## 1. System Overview
Build a full-stack, containerized chat application that acts as a client for an Agent2Agent (A2A) compliant server. The system must support synchronous A2A message exchange (JSON-RPC), handle the A2A `input-required` task state, and display real-time asynchronous progress updates (e.g., "calling db") pushed via webhooks from an external MCP server.

**Technology Stack:**
* **Frontend:** React (using Vite) + `socket.io-client` + standard CSS or Tailwind.
* **Backend:** Node.js + Express + `socket.io` + `axios`.
* **Deployment:** Docker + `docker-compose` (Targeting AWS EC2).

## 2. Directory Structure
```text
/a2a-client
  ├── /frontend             # React application
  │    ├── Dockerfile
  │    └── ...
  ├── /backend              # Node.js application
  │    ├── Dockerfile
  │    └── ...
  └── docker-compose.yml    # Orchestration
3. Backend Requirements (Node.js / Express)
The backend serves as a proxy to handle CORS securely, formats the A2A requests, manages task continuation, and acts as a real-time WebSocket hub for incoming webhooks.

A. Setup & Middleware:

Initialize Express with CORS enabled for the frontend.

Parse incoming JSON payloads.

B. Socket.io Hub:

Initialize a Socket.io server.

Listen for a join_room event from the client containing a contextId. Add the connecting socket to that specific room.

C. REST Endpoints:

POST /api/discover

Input: { "agentUrl": "http://..." }

Action: Make an HTTP GET to ${agentUrl}/.well-known/agent.json (or agent-card.json).

Output: Return the parsed JSON Agent Card.

POST /api/message

Input: { "agentUrl": "...", "contextId": "...", "taskId": "..." (optional), "userText": "..." }

Action: Construct the A2A JSON-RPC 2.0 payload. If taskId is provided, include it to resume a paused task:

JSON
{
  "jsonrpc": "2.0",
  "method": "sendMessage",
  "id": "<generate-new-uuid>",
  "params": {
    "contextId": "<contextId-from-request>",
    "taskId": "<taskId-from-request-if-exists>",
    "message": {
      "role": "user",
      "parts": [{"type": "text", "text": "<userText>"}]
    }
  }
}
Send an HTTP POST to ${agentUrl} with this payload.

Output: Parse the response. Extract the agent's text part, the task state, and the taskId. Return: { "text": "...", "state": "input-required" | "completed", "taskId": "..." }

POST /webhook (The Out-of-Band Listener)

Input: JSON payload from the agent/MCP server, e.g., { "contextId": "1234-5678", "status": "calling salesforce" }.

Action: Immediately emit a progress_update event strictly to the Socket.io room matching the contextId:
io.to(contextId).emit('progress_update', status)

Output: Return 200 OK immediately so the webhook sender is not blocked.

4. Frontend Requirements (React)
The frontend provides the user interface, maintains the real-time WebSocket connection to display intermediate agent states, and tracks blocked tasks.

A. UI/UX Layout:

Sidebar:

Input field for "Agent Base URL".

"Connect" button.

Information panel displaying Agent Name, Description, and Skills (populated after successful Discovery).

Main Chat Area:

Scrollable history of the conversation (styled differently for User vs Agent).

Status Indicator: A dedicated UI element (e.g., small italic text) located directly above the chat input box.

Chat input box and "Send" button pinned to the bottom. If the agent is awaiting input, visually highlight the input box or change the placeholder text.

B. State Management:

agentUrl: The confirmed URL of the server.

contextId: A UUIDv4 generated uniquely when the user successfully connects to an agent.

messages: Array of chat history [{ role: 'user', text: '...' }].

agentStatus: A string (default null) storing the live webhook status.

activeTaskId: A string (default null) storing the ID of a task that is currently paused.

isInputRequired: A boolean (default false) indicating if the agent is waiting for clarification.

C. Execution Flow:

Connection: User enters URL -> Client calls /api/discover -> On success, generate contextId, initialize Socket.io, and emit join_room with contextId.

Receiving Live Updates: Listen for progress_update via Socket.io. When fired, update agentStatus (e.g., render "⏳ Agent is: calling salesforce" in the Status Indicator).

Sending Messages:

Append user text to messages array.

Call /api/message, passing agentUrl, contextId, userText, and activeTaskId (if one exists).

Immediately set isInputRequired = false so the UI resets.

While waiting: The UI remains responsive to incoming Socket.io progress updates.

On response: * Append the final agent text to the messages array.

Set agentStatus to null to clear the typing indicator.

Check the returned task state: If 'input-required', set isInputRequired = true and activeTaskId = response.taskId. If 'completed', set activeTaskId = null.

5. Docker Orchestration
Ensure the application is ready for EC2 deployment using docker-compose.

Backend Service (api):

Dockerfile using node:18-alpine.

Expose port 3001.

Start command: npm start (or node server.js).

Frontend Service (web):

Multi-stage Dockerfile: Build with Node, serve static assets with nginx:alpine.

Expose port 80.

Ensure environment variables (e.g., VITE_API_URL) correctly route frontend API/Socket calls to the backend container.

docker-compose.yml:

Wire both services together. Ensure the backend port 3001 is mapped to the host so the external A2A Agent can reach http://<ec2-ip>:3001/webhook.