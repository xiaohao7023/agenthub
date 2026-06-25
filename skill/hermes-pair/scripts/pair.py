#!/usr/bin/env python3
"""
AgentHub Pair Script - Supabase 版本
生成配对码并注册到 Supabase
"""

import os
import sys
from pathlib import Path

# 加载 .env 文件
def load_env():
    env_file = Path(__file__).parent.parent / ".env"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())

load_env()
import json
import secrets
import string
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime

# 配置
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://awvggmbixfvmlmkpivqr.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "eyJhbG...BNKA")
CONFIG_DIR = Path.home() / ".hermes" / "agenthub"
CONFIG_FILE = CONFIG_DIR / "config.json"

def api_call(method, path, data=None):
    """调用 Supabase REST API"""
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode())
            return result[0] if isinstance(result, list) and len(result) == 1 else result
    except urllib.error.HTTPError as e:
        error = json.loads(e.read().decode())
        print(f"❌ API错误: {error.get('message', str(e))}")
        return None

def generate_pair_code():
    """生成8位大写字母+数字的配对码"""
    alphabet = string.ascii_uppercase + string.digits
    safe_alphabet = ''.join(c for c in alphabet if c not in '0O1IL')
    return ''.join(secrets.choice(safe_alphabet) for _ in range(8))

def detect_agent_type():
    """检测Agent类型"""
    if (Path.home() / ".openclaw").exists():
        return "openclaw"
    if (Path.home() / ".hermes").exists():
        return "hermes"
    if (Path.home() / ".claude").exists():
        return "claude-code"
    return "unknown"

def detect_agent_name():
    """检测Agent名称"""
    config_file = Path.home() / ".hermes" / "config.yaml"
    if config_file.exists():
        with open(config_file, 'r') as f:
            for line in f:
                if line.startswith("name:"):
                    return line.split(":", 1)[1].strip()
    return "Hermes Agent"

def main():
    print("🔗 正在生成配对码...\n")
    
    agent_type = detect_agent_type()
    agent_name = detect_agent_name()
    print(f"📱 Agent类型: {agent_type}")
    print(f"📛 Agent名称: {agent_name}\n")
    
    code = generate_pair_code()
    print(f"🔑 配对码: {code}\n")
    
    print("☁️ 正在注册到 Supabase...")
    result = api_call("POST", "agents", {
        "code": code,
        "type": agent_type,
        "name": agent_name,
        "status": "online"
    })
    
    if result and result.get("id"):
        print("✅ 注册成功！\n")
        
        # 保存配置
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        config = {
            "code": code,
            "type": agent_type,
            "name": agent_name,
            "paired_at": datetime.now().isoformat(),
            "supabase_url": SUPABASE_URL
        }
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
        
        print("💾 配置已保存\n")
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
