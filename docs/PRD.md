# AgentHub — AI Agent 手机管理平台

> 一行命令配对，扫码即连。管理你的所有 AI Agent。

---

## 一、产品定位

### 一句话
**AgentHub 是 AI Agent 的手机管理平台，任何人都能用它管理自己的 AI Agent。**

### 核心价值
| 用户 | 场景 | 价值 |
|------|------|------|
| **个人开发者** | 管理自己的多个 Agent | 随时随地掌控 |
| **小团队** | 统一管理团队 AI 助手 | 协作效率提升 |
| **自媒体** | 管理多平台内容 Agent | 内容产出监控 |
| **极客/黑客** | 多设备远程控制 | 极客体验 |
| **普通用户** | 管理家里的 AI 智能体 | 降低使用门槛 |

### 与竞品的差异
| 特性 | AgentHub | Portainer | Uptime Kuma | HomeAssistant |
|------|----------|-----------|-------------|---------------|
| **定位** | AI Agent 管理 | Docker 管理 | 监控 | 智能家居 |
| **扫码配对** | ✅ 5秒 | ❌ | ❌ | ❌ |
| **移动端** | ✅ 原生 APP | ❌ | ❌ 仅网页 | ✅ 但复杂 |
| **用户系统** | ✅ 多租户 | ❌ | ❌ | ⚠️ |
| **开放接入** | ✅ 任何 Agent | ❌ | ❌ | ❌ |
| **免费** | ✅ | ✅ | ✅ | ✅ |

**核心差异化：扫码配对 + 移动端优先 + 开放平台 + 用户系统**

---

## 二、用户旅程

### 2.1 新用户首次使用

```
下载 APP → 游客体验 → 注册账号 → 电脑端运行配对命令 → 手机输入配对码 → 绑定成功
```

### 2.2 日常使用

```
打开 APP → 查看 Agent 状态 → 选一个 Agent → 发送指令 → 查看回复
```

### 2.3 添加新 Agent

```
电脑端运行 pair 命令 → 得到配对码 → 手机输入配对码 → 完成
```

---

## 三、功能设计

### 3.1 用户系统

| 功能 | 说明 |
|------|------|
| 注册 | 手机号 + 验证码 / 邮箱 + 密码 |
| 登录 | 手机号 + 验证码 / 邮箱 + 密码 |
| 游客模式 | 无需注册即可体验（1个Agent限制） |
| 第三方登录 | Apple / Google / GitHub |
| 账号注销 | GDPR 合规 |

### 3.2 Agent 管理

| 功能 | 说明 |
|------|------|
| 扫码配对 | 扫二维码或输入配对码 |
| 添加 Agent | 输入配对码绑定 |
| 删除 Agent | 解绑 Agent |
| 重命名 Agent | 自定义 Agent 名称 |
| 分组管理 | 创建分组，按用途分类 |

### 3.3 状态监控

| 功能 | 说明 |
|------|------|
| 在线/离线 | 实时状态显示 |
| 最后活跃 | 显示最后心跳时间 |
| 系统信息 | CPU/内存/磁盘（可选） |
| 运行时间 | Agent 运行时长 |
| 错误告警 | Agent 异常时推送通知 |

### 3.4 消息交互

| 功能 | 说明 |
|------|------|
| 发送指令 | 输入自然语言指令 |
| 接收回复 | 显示 Agent 执行结果 |
| 历史记录 | 查看对话历史 |
| 快捷指令 | 预设常用指令 |
| 文件传输 | 发送/接收文件（P1） |

### 3.5 通知推送

| 功能 | 说明 |
|------|------|
| 状态变化 | Agent 上线/下线通知 |
| 任务完成 | 任务执行完成通知 |
| 错误告警 | Agent 异常通知 |
| 定时报告 | 每日/每周汇总 |

### 3.6 设置

| 功能 | 说明 |
|------|------|
| 通知设置 | 开关各类通知 |
| 刷新频率 | 自动刷新间隔（5s/10s/30s） |
| 深色模式 | 亮色/暗色主题 |
| 语言 | 中文/English |
| 关于 | 版本/隐私政策/用户协议 |

---

## 四、数据库设计

### 4.1 用户表 (users)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  nickname VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Agent 表 (agents)
```sql
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(8) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,          -- hermes, openclaw, claude-code, custom
  name VARCHAR(100) DEFAULT 'Unknown Agent',
  status VARCHAR(20) DEFAULT 'offline',
  description TEXT,
  group_name VARCHAR(50),             -- 分组
  paired_at TIMESTAMPTZ DEFAULT NOW(),
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3 消息表 (messages)
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  direction VARCHAR(20) NOT NULL,    -- user_to_agent / agent_to_user
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',  -- pending / sent / delivered / read
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.4 Agent Token 表 (agent_tokens)
```sql
CREATE TABLE agent_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.5 RLS 策略
```sql
-- 用户只能看到自己的 Agent
CREATE POLICY "Users see own agents" ON agents
  FOR ALL USING (user_id = auth.uid());

-- 用户只能看到自己的消息
CREATE POLICY "Users see own messages" ON messages
  FOR ALL USING (user_id = auth.uid());

-- Agent 只能访问自己的 token
CREATE POLICY "Agent access own token" ON agent_tokens
  FOR ALL USING (agent_id IN (
    SELECT id FROM agents WHERE code = current_setting('request.jwt.claims.agent_code')
  ));
```

---

## 五、API 设计

### 5.1 用户认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /auth/register | 注册（手机+验证码） |
| POST | /auth/login | 登录（手机+验证码） |
| POST | /auth/logout | 退出登录 |
| GET | /auth/me | 获取当前用户信息 |
| PUT | /auth/profile | 更新用户资料 |

### 5.2 Agent 管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /agents | 获取用户的 Agent 列表 |
| POST | /agents | 添加 Agent（配对码） |
| GET | /agents/:id | 获取 Agent 详情 |
| PUT | /agents/:id | 更新 Agent（名称/分组） |
| DELETE | /agents/:id | 删除 Agent |
| POST | /agents/:id/group | 移动到分组 |

### 5.3 消息交互

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /agents/:id/message | 发送消息给 Agent |
| GET | /agents/:id/messages | 获取消息历史 |
| GET | /agents/:id/messages/pending | 获取待处理消息（Agent调用） |
| POST | /agents/:id/response | Agent 返回响应 |

### 5.4 心跳

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /agents/:id/heartbeat | Agent 心跳 |
| GET | /agents/:id/status | 获取 Agent 状态 |

### 5.5 API Token 管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /agents/:id/token | 生成 Agent Token |
| DELETE | /agents/:id/token/:token_id | 撤销 Token |

---

## 六、Agent 端接入指南

### 6.1 配对流程

```
1. Agent 运行配对命令
2. 生成 8 位配对码（格式: [A-Z0-9]{8}）
3. 调用 POST /agents/pair 注册配对码
4. 等待用户在 APP 输入配对码
5. 配对成功，生成 Agent Token
```

### 6.2 心跳保活

```
每 30 秒调用 POST /agents/:id/heartbeat
携带 Agent Token 认证
```

### 6.3 消息处理

```
1. 定时调用 GET /agents/:id/messages/pending 拉取消息
2. 执行指令
3. 调用 POST /agents/:id/response 返回结果
```

### 6.4 Agent 端 SDK

```python
# Python SDK 示例
from agenthub_sdk import AgentHub

hub = AgentHub(api_url="https://api.agenthub.app")
hub.pair(code="ZHETBCMF")
hub.heartbeat()
hub.on_message(lambda msg: execute(msg.content))
hub.run()
```

```javascript
// Node.js SDK 示例
const { AgentHub } = require('agenthub-sdk');
const hub = new AgentHub('https://api.agenthub.app');
await hub.pair('ZHETBCMF');
hub.heartbeat();
hub.onMessage(msg => execute(msg.content));
hub.run();
```

---

## 七、安全设计

### 7.1 认证

| 场景 | 方式 |
|------|------|
| 用户登录 | Supabase Auth（JWT） |
| Agent 认证 | Bearer Token（每 Agent 唯一） |
| API 调用 | JWT + Agent Token 双重验证 |

### 7.2 数据隔离

- 每个用户只能看到自己的 Agent
- 每个 Agent 只能访问自己的消息
- RLS 策略强制执行

### 7.3 通信安全

- HTTPS 强制
- Token 定期轮换
- 敏感数据加密存储

---

## 八、非功能需求

### 8.1 性能

| 指标 | 目标 |
|------|------|
| 心跳响应 | < 100ms |
| 消息发送 | < 500ms |
| 状态查询 | < 200ms |
| 并发支持 | 1000+ 用户 |

### 8.2 可靠性

| 指标 | 目标 |
|------|------|
| 可用性 | 99.9% |
| 数据备份 | 每日自动备份 |
| 故障恢复 | < 5 分钟 |

### 8.3 可扩展性

- 支持 Agent 数量：无上限
- 支持消息量：100万+/月
- 支持用户数：1万+

---

## 九、上线计划

### Phase 1：MVP（1周）

**目标：核心流程跑通**

- [ ] 用户注册/登录
- [ ] Agent 配对
- [ ] 状态监控
- [ ] 发送消息
- [ ] 接收回复

### Phase 2：体验优化（2周）

**目标：好用**

- [ ] 推送通知
- [ ] 消息历史
- [ ] 分组管理
- [ ] 快捷指令
- [ ] 深色模式

### Phase 3：开放平台（1个月）

**目标：别人能用**

- [ ] Agent 端 SDK（Python/Node.js）
- [ ] 接入文档
- [ ] 开发者社区
- [ ] Agent 市场（发现/分享）

### Phase 4：商业化（2个月）

**目标：赚钱**

- [ ] 付费计划
- [ ] 团队管理
- [ ] 高级功能
- [ ] App Store 上架

---

## 十、变现模式

### 10.1 免费版

| 功能 | 限制 |
|------|------|
| Agent 数量 | 2个 |
| 消息历史 | 7天 |
| 通知 | 基础 |
| 支持 | 社区 |

### 10.2 Pro 版（$4.99/月 或 $49.99/年）

| 功能 | 无限制 |
|------|--------|
| Agent 数量 | 无限 |
| 消息历史 | 30天 |
| 通知 | 全部 |
| 文件传输 | ✅ |
| 优先支持 | ✅ |

### 10.3 Team 版（$19.99/月）

| 功能 | 无限制 |
|------|--------|
| 所有 Pro 功能 | ✅ |
| 团队成员 | 10人 |
| 审计日志 | ✅ |
| 优先支持 | ✅ |

---

## 十一、风险与对策

| 风险 | 概率 | 对策 |
|------|------|------|
| 用户增长慢 | 高 | 开源社区推广 |
| 竞品跟进 | 中 | 持续迭代，保持先发 |
| App Store 审核 | 低 | 提前准备隐私政策 |
| Agent 端兼容性 | 中 | 提供标准 SDK |
| 安全漏洞 | 低 | 定期审计，Bug Bounty |

---

## 十二、成功指标

| 阶段 | 目标 |
|------|------|
| M1（1周后） | MVP 可用，自己用起来 |
| M2（1个月后） | 100 用户，10 个 Agent |
| M3（3个月后） | 1000 用户，100 个 Agent |
| M6（6个月后） | 10000 用户，1000 个 Agent |

---

*文档版本: v2.0（平台版）*
*创建日期: 2026-06-25*
*更新: 从内部工具升级为开放平台*
