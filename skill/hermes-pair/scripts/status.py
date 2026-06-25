#!/usr/bin/env python3
"""
Hermes Agent Status Script
查看配对状态
"""

import os
import json
import urllib.request
from pathlib import Path

WORKER_URL = os.environ.get("AGENTHUB_WORKER_URL", "https://agenthub.your-domain.com")
CONFIG_FILE = Path.home() / ".hermes" / "agenthub" / "config.json"

def get_agent_info(code):
    """从云端获取Agent信息"""
    url = f"{WORKER_URL}/api/agent/{code}"
    
    req = urllib.request.Request(url, headers={"Content-Type": "application/json"})
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"❌ 获取信息失败: {e}")
        return None

def main():
    """主函数"""
    # 检查配置文件
    if not CONFIG_FILE.exists():
        print("❌ 未找到配对配置")
        print("💡 请先运行 '配对' 命令生成配对码")
        return
    
    with open(CONFIG_FILE, 'r') as f:
        config = json.load(f)
    
    code = config.get("code")
    if not code:
        print("❌ 配对码无效")
        return
    
    print("📡 正在查询Agent状态...\n")
    
    # 获取Agent信息
    agent = get_agent_info(code)
    
    if not agent:
        print("❌ 无法获取Agent信息")
        return
    
    # 显示状态
    status_emoji = "🟢" if agent.get("status") == "online" else "🔴"
    
    print("=" * 50)
    print(f"📛 Agent名称: {agent.get('name', 'Unknown')}")
    print(f"📱 Agent类型: {agent.get('type', 'Unknown')}")
    print(f"🔑 配对码:    {agent.get('code', 'Unknown')}")
    print(f"📊 状态:      {status_emoji} {agent.get('status', 'Unknown')}")
    print(f"🕐 配对时间:  {agent.get('pairedAt', 'Unknown')}")
    print(f"💓 最后心跳:  {agent.get('lastHeartbeat', 'Unknown')}")
    print("=" * 50)

if __name__ == "__main__":
    main()
