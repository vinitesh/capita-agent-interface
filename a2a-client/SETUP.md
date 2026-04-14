# Capita Agent Interface — EC2 Setup Guide

## Prerequisites

- AWS account with permissions to create EC2 instances and DynamoDB tables
- EC2 instance running Amazon Linux 2 or Ubuntu 22.04
- IAM user or role with DynamoDB access

---

## Step 1: Create DynamoDB Tables

Run these commands from any machine with AWS CLI configured:

```bash
# Chat sessions table
aws dynamodb create-table \
  --table-name a2a-chat-sessions \
  --attribute-definitions AttributeName=contextId,AttributeType=S \
  --key-schema AttributeName=contextId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Agent history table
aws dynamodb create-table \
  --table-name a2a-agent-history \
  --attribute-definitions AttributeName=agentUrl,AttributeType=S \
  --key-schema AttributeName=agentUrl,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Users table
aws dynamodb create-table \
  --table-name a2a-users \
  --attribute-definitions AttributeName=username,AttributeType=S \
  --key-schema AttributeName=username,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

Wait ~30 seconds for tables to become ACTIVE.

---

## Step 2: Launch EC2 Instance

1. Launch an EC2 instance (recommended: `t3.small` or larger)
2. AMI: Amazon Linux 2023 or Ubuntu 22.04
3. Security Group — open these inbound ports:
   - `22` — SSH
   - `80` — Frontend UI
   - `3001` — Backend API + Webhook
   - `8080` — MCP Server

---

## Step 3: Install Docker & Docker Compose on EC2

SSH into your instance, then:

**Amazon Linux 2023:**
```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
newgrp docker

# Install docker-compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

**Ubuntu 22.04:**
```bash
sudo apt update && sudo apt install -y docker.io git
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
newgrp docker

sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

---

## Step 4: Clone the Repository

```bash
git clone https://github.com/vinitesh/capita-agent-interface.git
cd capita-agent-interface/a2a-client
```

---

## Step 5: Configure Environment Variables

Create the backend `.env` file:

```bash
cat > backend/.env << EOF
PORT=3001
AWS_REGION=us-east-1
DYNAMODB_TABLE=a2a-chat-sessions
AGENT_HISTORY_TABLE=a2a-agent-history
USERS_TABLE=a2a-users
AWS_ACCESS_KEY_ID=your-access-key-here
AWS_SECRET_ACCESS_KEY=your-secret-key-here
EOF
```

> If using an IAM role attached to the EC2 instance, omit `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` — the SDK will use the instance role automatically.

Set the EC2 public IP for the frontend Socket.io connection:

```bash
export VITE_API_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3001
echo "VITE_API_URL=$VITE_API_URL" >> .env
```

---

## Step 6: Build and Start

```bash
docker-compose up --build -d
```

This starts three containers:
- `api` — Node.js backend on port 3001
- `web` — React frontend on port 80
- `mcp` — MCP webhook server on port 8080

Check they're running:
```bash
docker-compose ps
docker-compose logs -f api
```

---

## Step 7: Verify

1. Open `http://<ec2-public-ip>` in your browser
2. Login with `admin` / `admin` (change this immediately via User Management)
3. Test the backend: `curl http://<ec2-public-ip>:3001/health` (should return 404 — no health route, but connection works)
4. Test the MCP server: `curl http://<ec2-public-ip>:8080/health`

---

## Step 8: Test Webhook

Send a test progress update to a chat session:

```bash
curl -X POST http://<ec2-public-ip>:3001/webhook \
  -H "Content-Type: application/json" \
  -d '{"contextId": "YOUR-CONTEXT-ID", "status": "calling salesforce"}'
```

The context ID is shown in the NOTE appended to each message sent to the agent.

---

## MCP Server Configuration

Your A2A agent's MCP config should point to:

```
http://<ec2-public-ip>:8080/mcp
```

The `set-status` tool accepts:
- `contextId` — the chat session context ID (from the NOTE in each message)
- `status` — the status text to display in the chat UI

---

## Updating the App

```bash
cd capita-agent-interface
git pull
cd a2a-client
docker-compose down
docker-compose up --build -d
```

---

## Troubleshooting

**Webhook received but status not visible in chat:**
Make sure `VITE_API_URL` is set to the EC2 public IP (not `localhost`) before building. The frontend Socket.io connection must reach the backend from the browser.

**DynamoDB errors:**
Verify the IAM user/role has `dynamodb:*` permissions on the three tables, and the `AWS_REGION` matches where the tables were created.

**Port not accessible:**
Check the EC2 Security Group inbound rules include ports 80, 3001, and 8080.

**Admin password:**
Change the default `admin/admin` credentials immediately after first login via the User Management panel (sidebar, admin only).
