# AgentHub

AI Agent 手机管理APP - 让你用手机管理所有的AI Agent

## 项目结构

```
agenthub/
├── worker/           # Cloudflare Worker（云端中继）
│   ├── src/
│   │   └── index.js  # Worker主代码
│   ├── wrangler.toml # Worker配置
│   └── package.json  # 依赖配置
│
├── skill/            # Agent端Skill
│   └── hermes-pair/
│       ├── SKILL.md  # Skill说明
│       └── scripts/
│           ├── pair.py    # 生成配对码
│           ├── status.py  # 查看状态
│           ├── unpair.py  # 取消配对
│           └── daemon.py  # 守护进程
│
├── scripts/          # 一键脚本
│   └── pair.sh       # 一键配对脚本
│
└── docs/             # 文档
```

## 快速开始

### 1. 部署Cloudflare Worker

```bash
cd worker
npm install
wrangler login
wrangler kv:namespace create "AGENTS_KV"
# 把返回的ID填入 wrangler.toml
wrangler deploy
```

### 2. Agent端配对

**方式一：一键脚本（推荐）**

```bash
curl -sSL https://agenthub.your-domain.com/pair.sh | bash
```

**方式二：使用Hermes Skill**

```
配对
```

**方式三：手动运行脚本**

```bash
python3 ~/.hermes/skills/hermes-pair/scripts/pair.py
```

### 3. 手机APP配对

1. 下载AgentHub APP
2. 点击"扫码配对"或"输入配对码"
3. 输入配对码
4. 完成！

## 功能特性

- ✅ 扫码配对
- ✅ 跨网络连接
- ✅ 支持多种Agent（OpenClaw、Hermes、Claude Code等）
- ✅ 实时状态监控
- ✅ 远程发送命令
- ✅ 消息推送通知

## 命令参考

| 命令 | 说明 |
|------|------|
| `配对` | 生成配对码 |
| `配对状态` | 查看当前配对状态 |
| `取消配对` | 取消当前配对 |
| `启动守护进程` | 后台运行，接收APP命令 |

## 支持的Agent

- OpenClaw (虾子🦞)
- Hermes (虾管)
- Claude Code
- Codex
- Kimi Code

## 技术栈

- **云端中继**: Cloudflare Workers + KV
- **Agent端**: Python
- **手机APP**: Flutter

## 成本

- **个人使用**: 免费
- **1000用户**: $6/月

## License

MIT
