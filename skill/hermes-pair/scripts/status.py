#!/usr/bin/env python3
"""查看Agent配对状态"""

import os
import json
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
import urllib.request
from pathlib import Path

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://awvggmbixfvmlmkpivqr.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "eyJhbG...BNKA")
CONFIG_FILE = Path.home() / ".hermes" / "agenthub" / "config.json"

def api_get(path):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode())

def main():
    if not CONFIG_FILE.exists():
        print("❌ 未找到配对配置，请先运行 pair.py")
        return
    
    with open(CONFIG_FILE) as f:
        config = json.load(f)
    
    code = config.get("code")
    result = api_get(f"agents?select=*&code=eq.{code}")
    
    if not result:
        print(f"❌ Agent {code} 未找到")
        return
    
    agent = result[0]
    status_icon = "🟢" if agent["status"] == "online" else "🔴"
    
    print(f"\n{status_icon} Agent 状态")
    print(f"  配对码: {agent['code']}")
    print(f"  类型: {agent['type']}")
    print(f"  名称: {agent['name']}")
    print(f"  状态: {agent['status']}")
    print(f"  配对时间: {agent['paired_at']}")
    print(f"  最后心跳: {agent['last_heartbeat']}")
    print()

if __name__ == "__main__":
    main()
