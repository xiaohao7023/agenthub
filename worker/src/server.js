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

    // Setup page - GET /setup
    if (path === '/setup' && method === 'GET') {
      const setupHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AgentHub Setup</title>
<style>
body{font-family:-apple-system,sans-serif;background:#f5f5f5;padding:20px;display:flex;justify-content:center}
.card{background:#fff;border-radius:12px;padding:24px;max-width:360px;width:100%;box-shadow:0 2px 8px rgba(0,0,0,.1)}
h2{margin-bottom:16px;color:#333}.field{margin-bottom:14px}
label{display:block;font-size:13px;color:#666;margin-bottom:4px}
input{width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px}
button{width:100%;padding:12px;background:#4CAF50;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer}
.ok{margin-top:16px;padding:12px;background:#e8f5e9;border-radius:8px;display:none;color:#2e7d32}
.err{background:#ffebee;color:#c62828}</style></head>
<body><div class="card"><h2>🔗 AgentHub 配置</h2>
<div class="field"><label>Anon Key</label><input id="a" placeholder="eyJ..."></div>
<div class="field"><label>Service Role Key</label><input id="s" placeholder="eyJ..."></div>
<button onclick="save()">保存配置</button>
<div id="msg" class="ok"></div></div>
<script>
async function save(){
const a=document.getElementById('a').value.trim();
const s=document.getElementById('s').value.trim();
const m=document.getElementById('msg');
if(!a||!s){m.className='ok err';m.style.display='block';m.textContent='请填写两个Key';return}
try{const r=await fetch('/setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({anon:a,service:s})});
const d=await r.json();if(d.ok){m.className='ok';m.style.display='block';m.textContent='✅ 配置成功！'}
else{m.className='ok err';m.style.display='block';m.textContent='❌ '+d.error}}
catch(e){m.className='ok err';m.style.display='block';m.textContent='❌ 网络错误'}}
</script></body></html>`;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(setupHtml);
    }

    // Setup save - POST /setup
    if (path === '/setup' && method === 'POST') {
      const body = await parseBody(req);
      const { anon, service } = body;
      if (!anon || !service) {
        res.writeHead(400, headers);
        return res.end(JSON.stringify({ error: 'Missing keys' }));
      }
      const fs = require('fs');
      const envContent = `SUPABASE_URL=https://awvggmbixfvmlmkpivqr.supabase.co\nSUPABASE_ANON_KEY=${anon}\nSUPABASE_SERVICE_KEY=${service}\n`;
      const paths = [
        require('os').homedir() + '/agenthub/.env',
        require('os').homedir() + '/.hermes/skills/hermes-pair/.env'
      ];
      for (const p of paths) {
        require('path').dirname(p).split('/').reduce((acc, dir) => {
          const full = acc + '/' + dir;
          if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
          return full;
        }, '');
        fs.writeFileSync(p, envContent);
      }
      res.writeHead(200, headers);
      return res.end(JSON.stringify({ ok: true }));
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
