#!/usr/bin/env python3
"""
Hermes Agent Daemon Script
守护进程：定期发送心跳，处理来自APP的消息
"""

import os
import sys
import json
import time
import threading
import urllib.request
import urllib.error
from pathlib import Path

WORKER_URL = os.environ.get("AGENTHUB_WORKER_URL", "https://agenthub.your-domain.com")
CONFIG_FILE = Path.home() / ".hermes" / "agenthub" / "config.json"
HEARTBEAT_INTERVAL = 3600  # 1小时
MESSAGE_CHECK_INTERVAL = 10  # 10秒

def load_config():
    """加载配置"""
    if not CONFIG_FILE.exists():
        print("❌ 未找到配对配置")
        print("💡 请先运行 '配对' 命令生成配对码")
        return None
    
    with open(CONFIG_FILE, 'r') as f:
        return json.load(f)

def send_heartbeat(code):
    """发送心跳"""
    url = f"{WORKER_URL}/api/heartbeat"
    data = json.dumps({"code": code, "status": "online"}).encode('utf-8')
    
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return True
    except Exception as e:
        print(f"💓 心跳发送失败: {e}")
        return False

def check_messages(code):
    """检查待处理消息"""
    url = f"{WORKER_URL}/api/messages/{code}"
    
    req = urllib.request.Request(url, headers={"Content-Type": "application/json"})
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            return data.get("messages", [])
    except Exception as e:
        print(f"📥 消息检查失败: {e}")
        return []

def send_response(code, message_id, response_text):
    """发送响应"""
    url = f"{WORKER_URL}/api/response"
    data = json.dumps({
        "code": code,
        "messageId": message_id,
        "response": response_text
    }).encode('utf-8')
    
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return True
    except Exception as e:
        print(f"📤 发送响应失败: {e}")
        return False

def process_message(code, message):
    """处理消息"""
    msg_id = message.get("id")
    msg_text = message.get("message", "")
    msg_from = message.get("from", "unknown")
    
    print(f"📩 收到消息 [{msg_from}]: {msg_text}")
    
    # 这里可以集成Hermes的命令处理逻辑
    # 目前简单返回一个确认消息
    response = f"✅ 收到命令: {msg_text}\n正在处理中..."
    
    # 发送响应
    send_response(code, msg_id, response)
    print(f"📤 已响应消息: {msg_id}")

def heartbeat_loop(code):
    """心跳循环"""
    while True:
        send_heartbeat(code)
        time.sleep(HEARTBEAT_INTERVAL)

def message_loop(code):
    """消息检查循环"""
    while True:
        messages = check_messages(code)
        for msg in messages:
            process_message(code, msg)
        time.sleep(MESSAGE_CHECK_INTERVAL)

def main():
    """主函数"""
    # 加载配置
    config = load_config()
    if not config:
        sys.exit(1)
    
    code = config.get("code")
    if not code:
        print("❌ 配对码无效")
        sys.exit(1)
    
    print("🚀 AgentHub 守护进程启动")
    print(f"📱 Agent: {config.get('name', 'Unknown')}")
    print(f"🔑 配对码: {code}")
    print(f"☁️ 云端: {WORKER_URL}")
    print("\n按 Ctrl+C 停止\n")
    
    # 启动心跳线程
    heartbeat_thread = threading.Thread(target=heartbeat_loop, args=(code,), daemon=True)
    heartbeat_thread.start()
    print("💓 心跳线程已启动")
    
    # 启动消息检查线程
    message_thread = threading.Thread(target=message_loop, args=(code,), daemon=True)
    message_thread.start()
    print("📥 消息检查线程已启动")
    
    # 保持主线程运行
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 守护进程已停止")

if __name__ == "__main__":
    main()
