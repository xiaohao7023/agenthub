/**
 * AgentHub Cloudflare Worker
 * AI Agent 手机管理APP的云端中继服务
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    try {
      // API routes
      if (path.startsWith('/api/')) {
        return await handleAPI(path, method, request, env, headers);
      }

      // Health check
      if (path === '/health') {
        return new Response(JSON.stringify({ status: 'ok' }), { headers });
      }

      // Default
      return new Response('AgentHub Worker', { headers });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers,
      });
    }
  },
};

/**
 * Handle API routes
 */
async function handleAPI(path, method, request, env, headers) {
  // POST /api/pair - 注册配对码
  if (path === '/api/pair' && method === 'POST') {
    return await handlePair(request, env, headers);
  }

  // GET /api/agent/:code - 查询Agent信息
  const agentMatch = path.match(/^\/api\/agent\/([A-Z0-9]{8})$/);
  if (agentMatch && method === 'GET') {
    return await handleGetAgent(agentMatch[1], env, headers);
  }

  // POST /api/heartbeat - 心跳保活
  if (path === '/api/heartbeat' && method === 'POST') {
    return await handleHeartbeat(request, env, headers);
  }

  // POST /api/message - 发送消息给Agent
  if (path === '/api/message' && method === 'POST') {
    return await handleMessage(request, env, headers);
  }

  // GET /api/messages/:code - 获取Agent待处理消息
  const messagesMatch = path.match(/^\/api\/messages\/([A-Z0-9]{8})$/);
  if (messagesMatch && method === 'GET') {
    return await handleGetMessages(messagesMatch[1], env, headers);
  }

  // POST /api/response - Agent返回响应
  if (path === '/api/response' && method === 'POST') {
    return await handleResponse(request, env, headers);
  }

  // POST /api/unpair - 取消配对
  if (path === '/api/unpair' && method === 'POST') {
    return await handleUnpair(request, env, headers);
  }

  // GET /api/my-agents - 获取用户的所有Agent
  if (path === '/api/my-agents' && method === 'GET') {
    return await handleMyAgents(request, env, headers);
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers,
  });
}

/**
 * POST /api/pair - 注册配对码
 * Body: { code, type, name }
 */
async function handlePair(request, env, headers) {
  const body = await request.json();
  const { code, type, name } = body;

  if (!code || !type) {
    return new Response(JSON.stringify({ error: 'Missing code or type' }), {
      status: 400,
      headers,
    });
  }

  // 验证code格式（8位大写字母+数字）
  if (!/^[A-Z0-9]{8}$/.test(code)) {
    return new Response(JSON.stringify({ error: 'Invalid code format' }), {
      status: 400,
      headers,
    });
  }

  // 存储配对信息
  const agentInfo = {
    code,
    type, // openclaw, hermes, claude-code, codex
    name: name || 'Unknown Agent',
    status: 'online',
    pairedAt: new Date().toISOString(),
    lastHeartbeat: new Date().toISOString(),
  };

  await env.AGENTS_KV.put(`agent:${code}`, JSON.stringify(agentInfo));

  // 记录用户-Agent绑定关系（假设userId是固定的，实际应该从token获取）
  // 这里简化处理，先不做用户系统
  const userAgentsKey = `user:default:agents`;
  const existing = await env.AGENTS_KV.get(userAgentsKey);
  const agents = existing ? JSON.parse(existing) : [];
  if (!agents.includes(code)) {
    agents.push(code);
    await env.AGENTS_KV.put(userAgentsKey, JSON.stringify(agents));
  }

  return new Response(JSON.stringify({ success: true, agent: agentInfo }), {
    headers,
  });
}

/**
 * GET /api/agent/:code - 查询Agent信息
 */
async function handleGetAgent(code, env, headers) {
  const agentData = await env.AGENTS_KV.get(`agent:${code}`);

  if (!agentData) {
    return new Response(JSON.stringify({ error: 'Agent not found' }), {
      status: 404,
      headers,
    });
  }

  const agent = JSON.parse(agentData);

  // 检查是否超时（超过24小时没心跳 = 离线）
  const lastHeartbeat = new Date(agent.lastHeartbeat);
  const now = new Date();
  const hoursSinceLastHeartbeat = (now - lastHeartbeat) / (1000 * 60 * 60);

  if (hoursSinceLastHeartbeat > 24) {
    agent.status = 'offline';
  }

  return new Response(JSON.stringify(agent), { headers });
}

/**
 * POST /api/heartbeat - 心跳保活
 * Body: { code, status? }
 */
async function handleHeartbeat(request, env, headers) {
  const body = await request.json();
  const { code, status } = body;

  if (!code) {
    return new Response(JSON.stringify({ error: 'Missing code' }), {
      status: 400,
      headers,
    });
  }

  const agentData = await env.AGENTS_KV.get(`agent:${code}`);

  if (!agentData) {
    return new Response(JSON.stringify({ error: 'Agent not paired' }), {
      status: 404,
      headers,
    });
  }

  const agent = JSON.parse(agentData);
  agent.lastHeartbeat = new Date().toISOString();
  if (status) {
    agent.status = status;
  }

  await env.AGENTS_KV.put(`agent:${code}`, JSON.stringify(agent));

  return new Response(JSON.stringify({ success: true }), { headers });
}

/**
 * POST /api/message - 发送消息给Agent
 * Body: { code, message, from? }
 */
async function handleMessage(request, env, headers) {
  const body = await request.json();
  const { code, message, from } = body;

  if (!code || !message) {
    return new Response(JSON.stringify({ error: 'Missing code or message' }), {
      status: 400,
      headers,
    });
  }

  // 检查Agent是否存在
  const agentData = await env.AGENTS_KV.get(`agent:${code}`);
  if (!agentData) {
    return new Response(JSON.stringify({ error: 'Agent not found' }), {
      status: 404,
      headers,
    });
  }

  // 创建消息
  const msg = {
    id: crypto.randomUUID(),
    code,
    message,
    from: from || 'mobile',
    timestamp: new Date().toISOString(),
    status: 'pending',
  };

  // 存储消息
  await env.AGENTS_KV.put(`msg:${code}:${msg.id}`, JSON.stringify(msg));

  // 添加到待处理队列
  const queueKey = `queue:${code}`;
  const queue = await env.AGENTS_KV.get(queueKey);
  const queueList = queue ? JSON.parse(queue) : [];
  queueList.push(msg.id);
  await env.AGENTS_KV.put(queueKey, JSON.stringify(queueList));

  return new Response(JSON.stringify({ success: true, messageId: msg.id }), {
    headers,
  });
}

/**
 * GET /api/messages/:code - 获取Agent待处理消息
 */
async function handleGetMessages(code, env, headers) {
  const queueKey = `queue:${code}`;
  const queue = await env.AGENTS_KV.get(queueKey);

  if (!queue) {
    return new Response(JSON.stringify({ messages: [] }), { headers });
  }

  const queueList = JSON.parse(queue);
  const messages = [];

  for (const msgId of queueList) {
    const msgData = await env.AGENTS_KV.get(`msg:${code}:${msgId}`);
    if (msgData) {
      messages.push(JSON.parse(msgData));
    }
  }

  // 清空队列
  await env.AGENTS_KV.put(queueKey, JSON.stringify([]));

  return new Response(JSON.stringify({ messages }), { headers });
}

/**
 * POST /api/response - Agent返回响应
 * Body: { code, messageId, response }
 */
async function handleResponse(request, env, headers) {
  const body = await request.json();
  const { code, messageId, response } = body;

  if (!code || !messageId || !response) {
    return new Response(
      JSON.stringify({ error: 'Missing code, messageId, or response' }),
      { status: 400, headers }
    );
  }

  // 存储响应
  const responseMsg = {
    id: crypto.randomUUID(),
    code,
    messageId,
    response,
    timestamp: new Date().toISOString(),
  };

  await env.AGENTS_KV.put(
    `resp:${code}:${messageId}`,
    JSON.stringify(responseMsg)
  );

  // 添加到响应队列
  const respQueueKey = `resp-queue:${code}`;
  const queue = await env.AGENTS_KV.get(respQueueKey);
  const queueList = queue ? JSON.parse(queue) : [];
  queueList.push(messageId);
  await env.AGENTS_KV.put(respQueueKey, JSON.stringify(queueList));

  return new Response(JSON.stringify({ success: true }), { headers });
}

/**
 * POST /api/unpair - 取消配对
 * Body: { code }
 */
async function handleUnpair(request, env, headers) {
  const body = await request.json();
  const { code } = body;

  if (!code) {
    return new Response(JSON.stringify({ error: 'Missing code' }), {
      status: 400,
      headers,
    });
  }

  // 删除Agent信息
  await env.AGENTS_KV.delete(`agent:${code}`);

  // 从用户Agent列表中移除
  const userAgentsKey = `user:default:agents`;
  const existing = await env.AGENTS_KV.get(userAgentsKey);
  if (existing) {
    const agents = JSON.parse(existing);
    const newAgents = agents.filter((a) => a !== code);
    await env.AGENTS_KV.put(userAgentsKey, JSON.stringify(newAgents));
  }

  return new Response(JSON.stringify({ success: true }), { headers });
}

/**
 * GET /api/my-agents - 获取用户的所有Agent
 */
async function handleMyAgents(request, env, headers) {
  const userAgentsKey = `user:default:agents`;
  const existing = await env.AGENTS_KV.get(userAgentsKey);

  if (!existing) {
    return new Response(JSON.stringify({ agents: [] }), { headers });
  }

  const agentCodes = JSON.parse(existing);
  const agents = [];

  for (const code of agentCodes) {
    const agentData = await env.AGENTS_KV.get(`agent:${code}`);
    if (agentData) {
      const agent = JSON.parse(agentData);

      // 检查在线状态
      const lastHeartbeat = new Date(agent.lastHeartbeat);
      const now = new Date();
      const hoursSinceLastHeartbeat =
        (now - lastHeartbeat) / (1000 * 60 * 60);
      agent.status = hoursSinceLastHeartbeat > 24 ? 'offline' : 'online';

      agents.push(agent);
    }
  }

  return new Response(JSON.stringify({ agents }), { headers });
}
