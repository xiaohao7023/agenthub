/**
 * AgentHub Standalone Server
 * 可以在 Render.com / 任何 Node.js 环境运行
 * 使用内存 + JSON 文件存储（替代 Cloudflare KV）
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, 'data.json');

// 数据存储
let data = { agents: {}, queues: {}, messages: {}, responses: {} };

// 加载数据
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to load data:', e.message);
  }
}

// 保存数据
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to save data:', e.message);
  }
}

// 解析请求体
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// 路由处理
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, headers);
    return res.end();
  }

  try {
    // Health check
    if (path === '/health') {
      res.writeHead(200, headers);
      return res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    }

    // POST /api/pair
    if (path === '/api/pair' && method === 'POST') {
      const body = await parseBody(req);
      const { code, type, name } = body;

      if (!code || !type) {
        res.writeHead(400, headers);
        return res.end(JSON.stringify({ error: 'Missing code or type' }));
      }

      if (!/^[A-Z0-9]{8}$/.test(code)) {
        res.writeHead(400, headers);
        return res.end(JSON.stringify({ error: 'Invalid code format' }));
      }

      const agentInfo = {
        code, type,
        name: name || 'Unknown Agent',
        status: 'online',
        pairedAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
      };

      data.agents[code] = agentInfo;
      if (!data.queues['default']) data.queues['default'] = [];
      if (!data.queues['default'].includes(code)) {
        data.queues['default'].push(code);
      }
      saveData();

      res.writeHead(200, headers);
      return res.end(JSON.stringify({ success: true, agent: agentInfo }));
    }

    // GET /api/agent/:code
    const agentMatch = path.match(/^\/api\/agent\/([A-Z0-9]{8})$/);
    if (agentMatch && method === 'GET') {
      const code = agentMatch[1];
      const agent = data.agents[code];
      if (!agent) {
        res.writeHead(404, headers);
        return res.end(JSON.stringify({ error: 'Agent not found' }));
      }

      // Check timeout
      const hoursSince = (Date.now() - new Date(agent.lastHeartbeat).getTime()) / (1000 * 60 * 60);
      if (hoursSince > 24) agent.status = 'offline';

      res.writeHead(200, headers);
      return res.end(JSON.stringify(agent));
    }

    // POST /api/heartbeat
    if (path === '/api/heartbeat' && method === 'POST') {
      const body = await parseBody(req);
      const { code, status } = body;
      if (!code) {
        res.writeHead(400, headers);
        return res.end(JSON.stringify({ error: 'Missing code' }));
      }
      const agent = data.agents[code];
      if (!agent) {
        res.writeHead(404, headers);
        return res.end(JSON.stringify({ error: 'Agent not paired' }));
      }
      agent.lastHeartbeat = new Date().toISOString();
      if (status) agent.status = status;
      saveData();

      res.writeHead(200, headers);
      return res.end(JSON.stringify({ success: true }));
    }

    // POST /api/message
    if (path === '/api/message' && method === 'POST') {
      const body = await parseBody(req);
      const { code, message, from } = body;
      if (!code || !message) {
        res.writeHead(400, headers);
        return res.end(JSON.stringify({ error: 'Missing code or message' }));
      }
      if (!data.agents[code]) {
        res.writeHead(404, headers);
        return res.end(JSON.stringify({ error: 'Agent not found' }));
      }

      const msg = {
        id: crypto.randomUUID(),
        code, message,
        from: from || 'mobile',
        timestamp: new Date().toISOString(),
        status: 'pending',
      };

      data.messages[msg.id] = msg;
      if (!data.queues[code]) data.queues[code] = [];
      data.queues[code].push(msg.id);
      saveData();

      res.writeHead(200, headers);
      return res.end(JSON.stringify({ success: true, messageId: msg.id }));
    }

    // GET /api/messages/:code
    const messagesMatch = path.match(/^\/api\/messages\/([A-Z0-9]{8})$/);
    if (messagesMatch && method === 'GET') {
      const code = messagesMatch[1];
      const queue = data.queues[code] || [];
      const messages = queue.map(id => data.messages[id]).filter(Boolean);
      data.queues[code] = [];
      saveData();

      res.writeHead(200, headers);
      return res.end(JSON.stringify({ messages }));
    }

    // POST /api/response
    if (path === '/api/response' && method === 'POST') {
      const body = await parseBody(req);
      const { code, messageId, response } = body;
      if (!code || !messageId || !response) {
        res.writeHead(400, headers);
        return res.end(JSON.stringify({ error: 'Missing fields' }));
      }

      const respMsg = {
        id: crypto.randomUUID(),
        code, messageId, response,
        timestamp: new Date().toISOString(),
      };
      data.responses[messageId] = respMsg;
      saveData();

      res.writeHead(200, headers);
      return res.end(JSON.stringify({ success: true }));
    }

    // POST /api/unpair
    if (path === '/api/unpair' && method === 'POST') {
      const body = await parseBody(req);
      const { code } = body;
      if (!code) {
        res.writeHead(400, headers);
        return res.end(JSON.stringify({ error: 'Missing code' }));
      }
      delete data.agents[code];
      saveData();

      res.writeHead(200, headers);
      return res.end(JSON.stringify({ success: true }));
    }

    // GET /api/my-agents
    if (path === '/api/my-agents' && method === 'GET') {
      const agents = Object.values(data.agents).map(agent => {
        const hoursSince = (Date.now() - new Date(agent.lastHeartbeat).getTime()) / (1000 * 60 * 60);
        agent.status = hoursSince > 24 ? 'offline' : 'online';
        return agent;
      });

      res.writeHead(200, headers);
      return res.end(JSON.stringify({ agents }));
    }

    // 404
    res.writeHead(404, headers);
    res.end(JSON.stringify({ error: 'Not found' }));

  } catch (error) {
    console.error('Error:', error);
    res.writeHead(500, headers);
    res.end(JSON.stringify({ error: error.message }));
  }
});

// 启动
loadData();
server.listen(PORT, () => {
  console.log(`🚀 AgentHub Server running on port ${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/health`);
});
