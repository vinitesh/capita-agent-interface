import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import { z } from "zod";

const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://api:3001/webhook";
const PORT = process.env.MCP_PORT || 8080;

// Track active transports by session ID
const transports = new Map();

function createServer() {
  const server = new McpServer({
    name: "a2a-webhook-mcp",
    version: "1.0.0",
    capabilities: { tools: {} },
  });

  server.tool(
    "set-status",
    "Send a progress status update to the A2A chat interface for a given context ID",
    {
      contextId: z.string().describe("The context ID of the chat session to send the update to"),
      status: z.string().describe("The status message to display (e.g. 'calling salesforce', 'querying database')"),
    },
    async ({ contextId, status }) => {
      console.error(`set-status: contextId=${contextId}, status=${status}`);
      try {
        const response = await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contextId, status }),
        });
        if (!response.ok) {
          const text = await response.text();
          return {
            content: [{ type: "text", text: `Webhook failed (${response.status}): ${text}` }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: `Status "${status}" sent to context ${contextId}` }],
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: `Error calling webhook: ${err.message}` }],
          isError: true,
        };
      }
    }
  );

  return server;
}

const app = express();
app.use(express.json());

app.get("/mcp", async (_req, res) => {
  console.error("New SSE connection");
  const transport = new SSEServerTransport("/messages", res);
  const sessionId = transport.sessionId;
  transports.set(sessionId, transport);

  const server = createServer();
  await server.connect(transport);

  res.on("close", () => {
    console.error(`SSE connection closed: ${sessionId}`);
    transports.delete(sessionId);
    server.close();
  });
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.get(sessionId);
  if (!transport) {
    return res.status(400).json({ error: "No active SSE connection for this session" });
  }
  await transport.handlePostMessage(req, res);
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", name: "a2a-webhook-mcp", activeSessions: transports.size });
});

app.listen(PORT, () => {
  console.error(`MCP webhook server running on port ${PORT}`);
  console.error(`SSE endpoint: http://localhost:${PORT}/mcp`);
  console.error(`Webhook target: ${WEBHOOK_URL}`);
});
