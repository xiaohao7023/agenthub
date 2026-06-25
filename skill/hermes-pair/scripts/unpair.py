#!/usr/bin/env python3
"""取消Agent配对"""

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

def api_delete(path):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    req = urllib.request.Request(url, headers=headers, method="DELETE")
    urllib.request.urlopen(req, timeout=10)

def main():
    if not CONFIG_FILE.exists():
        print("❌ 未找到配对配置")
        return
    
    with open(CONFIG_FILE) as f:
        config = json.load(f)
    
    code = config.get("code")
    print(f"🔗 正在取消配对 {code}...")
    
    api_delete(f"messages?agent_code=eq.{code}")
    api_delete(f"agents?code=eq.{code}")
    
    CONFIG_FILE.unlink(missing_ok=True)
    print("✅ 已取消配对")

if __name__ == "__main__":
    main()
