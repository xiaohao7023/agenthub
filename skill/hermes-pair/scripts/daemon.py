#!/usr/bin/env python3
"""
AgentHub 守护进程 - 定时发送心跳 + 获取消息
每30秒发送一次心跳，同时拉取待处理消息
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
import time
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://awvggmbixfvmlmkpivqr.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "eyJhbG...BNKA")
CONFIG_FILE = Path.home() / ".hermes" / "agenthub" / "config.json"
HEARTBEAT_INTERVAL = 30  # 秒

def api_call(method, path, data=None):
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
    except Exception as e:
        return None

def send_heartbeat(code):
    return api_call("PATCH", f"agents?code=eq.{code}", {
        "last_heartbeat": datetime.utcnow().isoformat(),
        "status": "online"
    })

def get_pending_messages(code):
    return api_call("GET", f"messages?select=*&agent_code=eq.{code}&status=eq.pending&order=created_at.asc")

def mark_message_done(msg_id):
    return api_call("PATCH", f"messages?id=eq.{msg_id}", {"status": "done"})

def main():
    if not CONFIG_FILE.exists():
        print("❌ 未找到配对配置，请先运行 pair.py")
        sys.exit(1)
    
    with open(CONFIG_FILE) as f:
        config = json.load(f)
    
    code = config["code"]
    print(f"🤖 AgentHub 守护进程启动")
    print(f"   配对码: {code}")
    print(f"   心跳间隔: {HEARTBEAT_INTERVAL}秒")
    print(f"   按 Ctrl+C 停止\n")
    
    while True:
        try:
            # 发送心跳
            send_heartbeat(code)
            print(f"[{datetime.now().strftime('%H:%M:%S')}] 💓 心跳已发送")
            
            # 检查消息
            messages = get_pending_messages(code)
            if messages and isinstance(messages, list) and len(messages) > 0:
                for msg in messages:
                    print(f"📩 收到消息: {msg['content']}")
                    # TODO: 这里可以接入 Agent 的消息处理逻辑
                    mark_message_done(msg["id"])
            
            time.sleep(HEARTBEAT_INTERVAL)
            
        except KeyboardInterrupt:
            print("\n🛑 守护进程已停止")
            break
        except Exception as e:
            print(f"⚠️ 错误: {e}")
            time.sleep(HEARTBEAT_INTERVAL)

if __name__ == "__main__":
    main()
