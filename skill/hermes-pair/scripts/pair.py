#!/usr/bin/env python3
"""
Hermes Agent Pair Script
生成配对码并注册到AgentHub云端
"""

import os
import sys
import json
import secrets
import string
import urllib.request
import urllib.error
from pathlib import Path

# 配置
WORKER_URL = os.environ.get("AGENTHUB_WORKER_URL", "https://agenthub-worker.huangxiaohao9121.workers.dev")
CONFIG_DIR = Path.home() / ".hermes" / "agenthub"
CONFIG_FILE = CONFIG_DIR / "config.json"

def generate_pair_code():
    """生成8位大写字母+数字的配对码"""
    alphabet = string.ascii_uppercase + string.digits
    # 排除容易混淆的字符：0/O, 1/I/L
    safe_alphabet = ''.join(c for c in alphabet if c not in '0O1IL')
    return ''.join(secrets.choice(safe_alphabet) for _ in range(8))

def detect_agent_type():
    """检测Agent类型"""
    # 检查OpenClaw
    if (Path.home() / ".openclaw").exists():
        return "openclaw"
    
    # 检查Hermes
    if (Path.home() / ".hermes").exists():
        return "hermes"
    
    # 检查Claude Code
    if (Path.home() / ".claude").exists():
        return "claude-code"
    
    # 检查Codex
    if (Path.home() / ".codex").exists():
        return "codex"
    
    # 检查Kimi Code
    if os.environ.get("KIMI_CODE"):
        return "kimi-code"
    
    return "unknown"

def detect_agent_name():
    """检测Agent名称"""
    # 从配置文件读取
    config_file = Path.home() / ".hermes" / "config.yaml"
    if config_file.exists():
        with open(config_file, 'r') as f:
            for line in f:
                if line.startswith("name:"):
                    return line.split(":", 1)[1].strip()
    
    # 默认名称
    return "Hermes Agent"

def register_pair_code(code, agent_type, agent_name):
    """向云端注册配对码"""
    url = f"{WORKER_URL}/api/pair"
    data = json.dumps({
        "code": code,
        "type": agent_type,
        "name": agent_name
    }).encode('utf-8')
    
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read().decode('utf-8'))
            return result
    except urllib.error.URLError as e:
        print(f"❌ 注册失败: {e}")
        return None

def save_config(code, agent_type, agent_name):
    """保存配对配置"""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    
    config = {
        "code": code,
        "type": agent_type,
        "name": agent_name,
        "paired_at": str(__import__('datetime').datetime.now()),
        "worker_url": WORKER_URL
    }
    
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)

def main():
    """主函数"""
    print("🔗 正在生成配对码...\n")
    
    # 检测Agent类型
    agent_type = detect_agent_type()
    agent_name = detect_agent_name()
    print(f"📱 Agent类型: {agent_type}")
    print(f"📛 Agent名称: {agent_name}\n")
    
    # 生成配对码
    code = generate_pair_code()
    print(f"🔑 配对码: {code}\n")
    
    # 注册到云端
    print("☁️ 正在注册到云端...")
    result = register_pair_code(code, agent_type, agent_name)
    
    if result and result.get("success"):
        print("✅ 注册成功！\n")
        
        # 保存配置
        save_config(code, agent_type, agent_name)
        print("💾 配置已保存\n")
        
        # 显示配对信息
        print("=" * 50)
        print("📱 请在手机APP中输入以下配对码：")
        print(f"\n🔑 {code}\n")
        print("=" * 50)
        print("\n💡 提示：")
        print("  - 配对码有效期：24小时")
        print("  - 如需取消配对，请说'取消配对'")
        print("  - 如需查看配对状态，请说'配对状态'")
    else:
        print("❌ 注册失败，请检查网络连接")
        sys.exit(1)

if __name__ == "__main__":
    main()
