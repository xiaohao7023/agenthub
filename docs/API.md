# AgentHub 后端对接文档

> 本文档供 AI 开发手机 APP 时使用，包含所有 API 接口、请求/响应格式、数据模型。

---

## 基础信息

| 项目 | 值 |
|------|-----|
| **后端类型** | Supabase PostgreSQL + REST API (PostgREST) |
| **项目 URL** | `https://awvggmbixfvmlmkpivqr.supabase.co` |
| **认证方式** | API Key (Header: `apikey` + `Authorization: Bearer`) |
| **响应格式** | JSON |
| **字符编码** | UTF-8 |

### 认证说明

所有请求需要两个 Header：

```
apikey: <your-anon-key>
Authorization: Bearer <your-service-role-key>
```

**⚠️ 安全注意：**
- `anon key` (可公开)：用于客户端只读查询
- `service_role key` (保密)：用于服务端写操作
- APP 中应通过后端代理或 Edge Function 调用，不要直接暴露 service_role key

---

## 数据库表结构

### 1. agents 表（Agent 配对信息）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键，自动生成 |
| `code` | VARCHAR(8) | 配对码，唯一，大写字母+数字 |
| `type` | VARCHAR(50) | Agent 类型：openclaw / hermes / claude-code / codex |
| `name` | VARCHAR(100) | Agent 名称 |
| `status` | VARCHAR(20) | 状态：online / offline / error |
| `paired_at` | TIMESTAMPTZ | 配对时间 |
| `last_heartbeat` | TIMESTAMPTZ | 最后心跳时间 |
| `created_at` | TIMESTAMPTZ | 创建时间 |

### 2. messages 表（消息队列）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键，自动生成 |
| `agent_code` | VARCHAR(8) | 关联的 Agent 配对码 |
| `content` | TEXT | 消息内容 |
| `from_source` | VARCHAR(50) | 来源：mobile / agent |
| `status` | VARCHAR(20) | 状态：pending / done |
| `created_at` | TIMESTAMPTZ | 创建时间 |

### 3. responses 表（Agent 响应）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID | 主键，自动生成 |
| `message_id` | UUID | 关联的消息 ID |
| `agent_code` | VARCHAR(8) | Agent 配对码 |
| `content` | TEXT | 响应内容 |
| `created_at` | TIMESTAMPTZ | 创建时间 |

---

## API 接口

### 1. 查询所有 Agent

```
GET /rest/v1/agents?select=*
```

**响应示例：**
```json
[
  {
    "id": "uuid",
    "code": "GNXJD2J9",
    "type": "openclaw",
    "name": "虾子",
    "status": "online",
    "paired_at": "2026-06-25T07:13:45+00:00",
    "last_heartbeat": "2026-06-25T07:13:45+00:00",
    "created_at": "2026-06-25T07:13:45+00:00"
  }
]
```

**APP 使用场景：** 首页加载 Agent 列表

---

### 2. 查询单个 Agent

```
GET /rest/v1/agents?select=*&code=eq.{CODE}
```

**参数：**
- `CODE`：8位配对码

**响应示例：**
```json
[
  {
    "id": "uuid",
    "code": "GNXJD2J9",
    "type": "openclaw",
    "name": "虾子",
    "status": "online",
    "paired_at": "2026-06-25T07:13:45+00:00",
    "last_heartbeat": "2026-06-25T07:13:45+00:00"
  }
]
```

**APP 使用场景：** Agent 详情页

---

### 3. 添加 Agent（配对）

```
POST /rest/v1/agents
```

**请求头：**
```
Content-Type: application/json
Prefer: return=representation
```

**请求体：**
```json
{
  "code": "GNXJD2J9",
  "type": "openclaw",
  "name": "虾子",
  "status": "online"
}
```

**字段说明：**
| 字段 | 必填 | 说明 |
|------|------|------|
| `code` | ✅ | 8位配对码（大写字母+数字） |
| `type` | ✅ | Agent 类型 |
| `name` | ❌ | Agent 名称，默认 "Unknown Agent" |
| `status` | ❌ | 默认 "online" |

**响应示例：**
```json
[
  {
    "id": "uuid",
    "code": "GNXJD2J9",
    "type": "openclaw",
    "name": "虾子",
    "status": "online",
    "paired_at": "2026-06-25T07:13:45+00:00",
    "last_heartbeat": "2026-06-25T07:13:45+00:00",
    "created_at": "2026-06-25T07:13:45+00:00"
  }
]
```

**APP 使用场景：** 添加 Agent 页面，用户输入配对码后调用

---

### 4. 更新 Agent 心跳

```
PATCH /rest/v1/agents?code=eq.{CODE}
```

**请求体：**
```json
{
  "last_heartbeat": "2026-06-25T07:13:45+00:00",
  "status": "online"
}
```

**APP 使用场景：** APP 不需要调用此接口（由 Agent 端定时调用）

---

### 5. 删除 Agent（取消配对）

```
DELETE /rest/v1/agents?code=eq.{CODE}
```

**APP 使用场景：** 设置页删除 Agent

---

### 6. 发送消息给 Agent

```
POST /rest/v1/messages
```

**请求头：**
```
Content-Type: application/json
Prefer: return=representation
```

**请求体：**
```json
{
  "agent_code": "GNXJD2J9",
  "content": "查看今日任务",
  "from_source": "mobile"
}
```

**字段说明：**
| 字段 | 必填 | 说明 |
|------|------|------|
| `agent_code` | ✅ | 目标 Agent 配对码 |
| `content` | ✅ | 消息内容 |
| `from_source` | ❌ | 来源，默认 "mobile" |

**响应示例：**
```json
[
  {
    "id": "uuid",
    "agent_code": "GNXJD2J9",
    "content": "查看今日任务",
    "from_source": "mobile",
    "status": "pending",
    "created_at": "2026-06-25T07:13:45+00:00"
  }
]
```

**APP 使用场景：** 发送消息页面

---

### 7. 获取 Agent 待处理消息

```
GET /rest/v1/messages?select=*&agent_code=eq.{CODE}&status=eq.pending&order=created_at.asc
```

**响应示例：**
```json
[
  {
    "id": "uuid",
    "agent_code": "GNXJD2J9",
    "content": "查看今日任务",
    "from_source": "mobile",
    "status": "pending",
    "created_at": "2026-06-25T07:13:45+00:00"
  }
]
```

**APP 使用场景：** Agent 端拉取消息（APP 不需要调用）

---

### 8. 标记消息完成

```
PATCH /rest/v1/messages?id=eq.{MESSAGE_ID}
```

**请求体：**
```json
{
  "status": "done"
}
```

**APP 使用场景：** Agent 端处理完消息后标记（APP 不需要调用）

---

### 9. 发送 Agent 响应

```
POST /rest/v1/responses
```

**请求体：**
```json
{
  "message_id": "uuid",
  "agent_code": "GNXJD2J9",
  "content": "今日任务：1. 写PRD 2. 部署后端"
}
```

**APP 使用场景：** Agent 端返回响应（APP 不需要调用）

---

### 10. 获取 Agent 响应

```
GET /rest/v1/responses?select=*&agent_code=eq.{CODE}&order=created_at.desc&limit=10
```

**响应示例：**
```json
[
  {
    "id": "uuid",
    "message_id": "uuid",
    "agent_code": "GNXJD2J9",
    "content": "今日任务：1. 写PRD 2. 部署后端",
    "created_at": "2026-06-25T07:13:45+00:00"
  }
]
```

**APP 使用场景：** 获取 Agent 最近的响应

---

## APP 需要实现的核心流程

### 流程 1：添加 Agent
```
用户输入配对码 → 调用 POST /rest/v1/agents → 保存到本地 → 显示在首页
```

### 流程 2：查看 Agent 列表
```
打开APP → 调用 GET /rest/v1/agents → 显示卡片列表（含在线状态）
```

### 流程 3：发送消息
```
用户输入消息 → 调用 POST /rest/v1/messages → 显示发送成功 → 轮询响应
```

### 流程 4：获取 Agent 响应
```
发送消息后 → 每2秒调用 GET /rest/v1/responses → 显示最新响应
```

### 流程 5：自动刷新状态
```
每30秒调用 GET /rest/v1/agents → 更新在线/离线状态
```

---

## 在线状态判断逻辑

Agent 的 `status` 字段由 Agent 端心跳更新。APP 端判断逻辑：

```dart
// 伪代码
bool isOnline(Agent agent) {
  final lastHeartbeat = DateTime.parse(agent.lastHeartbeat);
  final hoursSince = DateTime.now().difference(lastHeartbeat).inHours;
  return hoursSince < 24 && agent.status == 'online';
}
```

**状态显示：**
- 🟢 绿色：`status == 'online'` 且最后心跳 < 24小时
- 🔴 红色：`status == 'offline'` 或最后心跳 > 24小时

---

## 错误处理

### 常见错误响应

| HTTP 状态码 | 错误信息 | 处理方式 |
|------------|---------|---------|
| 400 | `Invalid API key` | 检查 API Key 是否正确 |
| 400 | `Invalid request` | 检查请求体格式 |
| 404 | `Not found` | 资源不存在 |
| 409 | `Unique violation` | 配对码已存在（重复添加） |
| 429 | `Too many requests` | 请求过于频繁，稍后重试 |

### Supabase 特有错误格式
```json
{
  "code": "PGRST116",
  "details": null,
  "hint": null,
  "message": "No row found"
}
```

---

## 技术建议

### 1. 认证安全
APP 中不要直接存储 `service_role key`。建议：
- 方案 A：使用 Supabase Edge Function 做代理，APP 调用 Edge Function
- 方案 B：使用 Supabase Auth 创建用户账号，通过 RLS 控制访问
- 方案 C（MVP）：直接使用 anon key + RLS 策略，写操作通过 Edge Function

### 2. 实时更新
Supabase 支持实时订阅（Realtime），可以用 WebSocket 监听数据变化：
```dart
// Flutter 使用 supabase_flutter 包
supabase.from('agents').stream(primaryKey: ['id']).listen((data) {
  // Agent 状态变化时自动更新 UI
});
```

### 3. 离线缓存
APP 应缓存 Agent 列表到本地，离线时也能查看：
```dart
// 使用 Hive 或 SharedPreferences 缓存
final agents = await supabase.from('agents').select();
await localStorage.setItem('agents', agents);
```

### 4. 配对码验证
配对码格式：8位大写字母+数字（排除 0/O/1/I/L）
```
正则表达式：^[A-Z2-9]{8}$
```

---

## 完整请求示例（cURL）

### 1. 查询所有 Agent
```bash
curl -s "https://awvggmbixfvmlmkpivqr.supabase.co/rest/v1/agents?select=*" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY"
```

### 2. 添加 Agent
```bash
curl -s -X POST "https://awvggmbixfvmlmkpivqr.supabase.co/rest/v1/agents" \
  -H "apikey: YOUR_SERVICE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"code":"TEST1234","type":"hermes","name":"Test Agent"}'
```

### 3. 发送消息
```bash
curl -s -X POST "https://awvggmbixfvmlmkpivqr.supabase.co/rest/v1/messages" \
  -H "apikey: YOUR_SERVICE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{"agent_code":"TEST1234","content":"查看今日任务","from_source":"mobile"}'
```

### 4. 获取 Agent 响应
```bash
curl -s "https://awvggmbixfvmlmkpivqr.supabase.co/rest/v1/responses?select=*&agent_code=eq.TEST1234&order=created_at.desc&limit=10" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY"
```

---

## 文件结构

```
agenthub/
├── skill/hermes-pair/scripts/   # Agent 端 Python 脚本
│   ├── pair.py                  # 生成配对码并注册
│   ├── status.py                # 查看配对状态
│   ├── unpair.py                # 取消配对
│   └── daemon.py                # 守护进程（心跳+消息）
├── worker/src/                  # Cloudflare Worker（备用）
│   ├── index.js                 # Worker 主代码
│   └── server.js                # 独立服务器版本
├── docs/
│   └── API.md                   # 本文档
└── .env                         # 环境变量（勿提交到 Git）
```

---

## 联系方式

- **开发者：** 豪哥 (xiaohao7023)
- **GitHub：** https://github.com/xiaohao7023/agenthub
- **Supabase Dashboard：** https://supabase.com/dashboard/project/awvggmbixfvmlmkpivqr

---

*文档版本: v1.0*
*更新日期: 2026-06-25*
