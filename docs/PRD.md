# AgentHub - 产品需求文档 (PRD)

> 版本: v1.0 | 更新日期: 2026-06-25 | 作者: 虾管

---

## 一、产品概述

### 1.1 一句话定位
**用手机管理你所有的 AI Agent**

### 1.2 核心价值
用户在 Agent 端运行一条命令，得到配对码。手机输入配对码，即刻绑定。之后所有 Agent 的状态、任务、消息，一部手机全管。

### 1.3 目标用户
| 用户群 | 场景 | 设备 |
|--------|------|------|
| 个人开发者 | 管理自己的多个 Agent | iOS / Android |
| 极客/黑客 | 多设备远程控制 | iOS / Android |
| 小团队 | 统一管理团队 AI 助手 | iOS / Android |

---

## 二、技术架构

### 2.1 后端（已完成）
- **数据库**: Supabase PostgreSQL
- **API**: Supabase REST API (PostgREST)
- **项目URL**: `https://awvggmbixfvmlmkpivqr.supabase.co`

### 2.2 API 端点

#### 认证方式
所有请求需带两个 Header：
```
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <SUPABASE_SERVICE_KEY>
```

#### 2.2.1 Agent 配对
```
POST /rest/v1/agents
Body: {
  "code": "ZHETBCMF",     // 8位配对码
  "type": "hermes",        // Agent类型
  "name": "虾管"           // Agent名称
}
Response: [{ "id": "uuid", "code": "...", "status": "online", ... }]
```

#### 2.2.2 查询 Agent
```
GET /rest/v1/agents?select=*&code=eq.{code}
Response: [{ "code": "...", "status": "online", "last_heartbeat": "...", ... }]
```

#### 2.2.3 查询所有 Agent
```
GET /rest/v1/agents?select=*&order=paired_at.desc
Response: [{ ... }, { ... }]
```

#### 2.2.4 心跳更新
```
PATCH /rest/v1/agents?code=eq.{code}
Body: { "last_heartbeat": "now()", "status": "online" }
```

#### 2.2.5 发送消息给 Agent
```
POST /rest/v1/messages
Body: {
  "agent_code": "ZHETBCMF",
  "content": "查看今日任务"
}
Response: [{ "id": "uuid", "status": "pending", ... }]
```

#### 2.2.6 获取 Agent 待处理消息
```
GET /rest/v1/messages?select=*&agent_code=eq.{code}&status=eq.pending&order=created_at.asc
Response: [{ "id": "...", "content": "...", "status": "pending", ... }]
```

#### 2.2.7 消息已处理
```
PATCH /rest/v1/messages?id=eq.{message_id}
Body: { "status": "done" }
```

#### 2.2.8 Agent 回复
```
POST /rest/v1/responses
Body: {
  "message_id": "uuid",
  "agent_code": "ZHETBCMF",
  "content": "今日任务: 早报已发送"
}
```

#### 2.2.9 取消配对
```
DELETE /rest/v1/agents?code=eq.{code}
DELETE /rest/v1/messages?agent_code=eq.{code}
```

---

## 三、APP 功能设计

### 3.1 页面结构

```
┌──────────────────────────────────────┐
│              AgentHub                │
├──────────────────────────────────────┤
│                                      │
│  ┌────────┐  ┌────────┐  ┌───────┐  │
│  │  🤖    │  │  🦞    │  │  +    │  │
│  │  虾管   │  │  虾子   │  │ 添加  │  │
│  │  🟢在线 │  │  🟢在线 │  │       │  │
│  └────────┘  └────────┘  └───────┘  │
│                                      │
│  ┌──────────────────────────────────┐│
│  │  📊 总览                         ││
│  │  在线: 2 | 任务: 5 | 错误: 0    ││
│  └──────────────────────────────────┘│
│                                      │
│  ┌──────────────────────────────────┐│
│  │  💬 最近消息                     ││
│  │  虾管: 早报已发送 - 08:00        ││
│  │  虾子: 任务完成 - 09:30          ││
│  └──────────────────────────────────┘│
│                                      │
│  [首页]  [消息]  [设置]              │
└──────────────────────────────────────┘
```

### 3.2 页面详细设计

#### 3.2.1 首页（Home）

**Agent 卡片列表**
- 每个 Agent 一张卡片
- 显示：图标、名称、状态（🟢在线/🔴离线）、最后心跳时间
- 点击进入 Agent 详情

**总览区域**
- 在线设备数
- 今日任务数
- 今日错误数

**快捷操作**
- [添加 Agent] — 输入配对码
- [刷新] — 手动刷新所有 Agent 状态

#### 3.2.2 Agent 详情页

**状态信息**
- Agent 名称、类型、配对时间
- 在线状态、最后心跳时间
- 运行时间（从配对到现在）

**操作按钮**
- [发送消息] — 向 Agent 发送指令
- [查看日志] — 查看 Agent 历史消息
- [重启] — 远程重启 Agent（P1功能）
- [取消配对] — 解绑此 Agent

**消息记录**
- 显示最近 20 条消息和回复
- 每条显示：内容、时间、状态（pending/done）

#### 3.2.3 发送消息页

**输入框**
- 多行文本输入
- 支持快捷命令：
  - `/status` — 查看状态
  - `/tasks` — 查看任务列表
  - `/logs` — 查看日志
  - `/restart` — 重启

**发送按钮**
- 点击后显示「等待回复...」
- Agent 回复后自动显示

#### 3.2.4 添加 Agent 页

**输入配对码**
- 8位大写字母+数字输入框
- 支持从剪贴板粘贴
- 输入时自动大写

**确认配对**
- 验证配对码有效性
- 显示 Agent 信息（名称、类型）
- 确认添加

#### 3.2.5 设置页

**通用设置**
- 刷新间隔（30秒/1分钟/5分钟）
- 通知开关
- 深色模式

**关于**
- 版本号
- GitHub 链接
- 反馈入口

---

## 四、交互设计

### 4.1 配对流程
```
用户打开APP → 点击「添加Agent」→ 输入配对码 → 确认 → 完成
```

### 4.2 消息流程
```
用户点「发送消息」→ 输入内容 → 发送 → 等待回复 → 显示回复
```

### 4.3 状态刷新
- 自动刷新：每30秒
- 手动刷新：下拉刷新 / 点击刷新按钮
- 实时更新：Agent 状态变化时立即更新

### 4.4 通知
- Agent 离线时推送通知
- 收到新消息时推送通知
- Agent 状态变化时推送通知

---

## 五、数据模型

### 5.1 Agent
```json
{
  "id": "uuid",
  "code": "ZHETBCMF",           // 8位配对码
  "type": "hermes|openclaw|claude-code|codex",
  "name": "虾管",                // Agent名称
  "status": "online|offline",
  "paired_at": "ISO timestamp",
  "last_heartbeat": "ISO timestamp",
  "created_at": "ISO timestamp"
}
```

### 5.2 Message
```json
{
  "id": "uuid",
  "agent_code": "ZHETBCMF",
  "content": "查看今日任务",
  "from_source": "mobile|agent",
  "status": "pending|done",
  "created_at": "ISO timestamp"
}
```

### 5.3 Response
```json
{
  "id": "uuid",
  "message_id": "uuid",
  "agent_code": "ZHETBCMF",
  "content": "今日任务: 早报已发送",
  "created_at": "ISO timestamp"
}
```

---

## 六、技术约束

### 6.1 后端
- 使用 Supabase REST API（PostgREST）
- 认证使用 service_role key（MVP阶段，后续加 RLS + anon key）
- 实时通信暂用轮询（每30秒），后续可升级 Supabase Realtime

### 6.2 前端
- Flutter（推荐）或 React Native
- 最低支持 iOS 14 / Android 8
- 离线缓存：最近 7 天消息本地存储

### 6.3 安全
- MVP阶段：service_role key 硬编码在APP中
- V2阶段：实现用户系统，使用 anon key + RLS
- 配对码有效期：24小时

---

## 七、里程碑

### M1 - MVP（1周）
- [ ] Agent 卡片列表（首页）
- [ ] 添加 Agent（输入配对码）
- [ ] Agent 详情（状态查看）
- [ ] 发送消息
- [ ] 自动刷新

### M2 - 功能完善（2周）
- [ ] 消息记录查看
- [ ] 通知推送
- [ ] 深色模式
- [ ] 快捷命令

### M3 - 高级功能（1月）
- [ ] 日志查看
- [ ] 任务管理
- [ ] 多用户支持
- [ ] Agent 协作

---

## 八、设计规范

### 8.1 颜色
- 主色：#4CAF50（绿色，在线状态）
- 辅助：#FF9800（警告）
- 错误：#F44336（离线/错误）
- 背景：#F5F5F5
- 卡片：#FFFFFF

### 8.2 字体
- 标题：16-20px Bold
- 正文：14px Regular
- 辅助：12px Regular

### 8.3 间距
- 页面边距：16px
- 卡片间距：12px
- 内部间距：16px

---

## 九、开放问题

1. **用户系统**：MVP 是否需要登录？（建议：不需要，V2 加）
2. **Agent 分组**：是否需要按项目/设备分组？（建议：V2 加）
3. **WebSocket**：是否需要实时通信？（建议：先用轮询，够用再加）

---

*文档版本: v1.0*
*创建日期: 2026-06-25*
*作者: 虾管*
