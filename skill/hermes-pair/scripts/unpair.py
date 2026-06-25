#!/usr/bin/env python3
"""
Hermes Agent Unpair Script
取消配对
"""

import os
import json
import urllib.request
from pathlib import Path

WORKER_URL = os.environ.get("AGENTHUB_WORKER_URL", "https://agenthub.your-domain.com")
CONFIG_FILE = Path.home() / ".hermes" / "agenthub" / "config.json"

def unpair_agent(code):
    """从云端取消配对"""
    url = f"{WORKER_URL}/api/unpair"
    data = json.dumps({"code": code}).encode('utf-8')
    
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"❌ 取消配对失败: {e}")
        return None

def main():
    """主函数"""
    # 检查配置文件
    if not CONFIG_FILE.exists():
        print("❌ 未找到配对配置")
        print("💡 当前没有配对的Agent")
        return
    
    with open(CONFIG_FILE, 'r') as f:
        config = json.load(f)
    
    code = config.get("code")
    if not code:
        print("❌ 配对码无效")
        return
    
    print("🔗 正在取消配对...\n")
    
    # 取消配对
    result = unpair_agent(code)
    
    if result and result.get("success"):
        print("✅ 配对已取消！\n")
        
        # 删除配置文件
        CONFIG_FILE.unlink()
        print("💾 配置已删除")
    else:
        print("❌ 取消配对失败")

if __name__ == "__main__":
    main()
