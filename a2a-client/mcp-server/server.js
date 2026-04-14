import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";

const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://api:3001/webhook";
const PORT = parseInt(process.env.MCP_PORT || "8080", 10);

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

// Stateless StreamableHTTP — each POST creates a fresh server+transport
app.post("/mcp", async (req, res) => {
  console.error("MCP request received");
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless mode
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  await server.close();
});

// GET /mcp for SSE streaming (optional, for clients that need it)
app.get("/mcp", async (req, res) => {
  res.status(405).json({ error: "Use POST /mcp for MCP requests" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", name: "a2a-webhook-mcp", port: PORT });
});

app.listen(PORT, "0.0.0.0", () => {
  console.error(`MCP webhook server running on port ${PORT}`);
  console.error(`MCP endpoint: http://localhost:${PORT}/mcp`);
  console.error(`Webhook target: ${WEBHOOK_URL}`);
});
