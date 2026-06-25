#!/bin/bash
# AgentHub 启动脚本
# 启动 Server + Cloudflare Tunnel

AGENTHUB_DIR="/home/guotuzi/agenthub/worker"
LOG_DIR="/tmp"
PID_FILE="/tmp/agenthub.pid"
TUNNEL_PID_FILE="/tmp/agenthub-tunnel.pid"

case "${1:-start}" in
  start)
    # 检查是否已运行
    if [ -f "$PID_FILE" ] && kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
      echo "AgentHub 已在运行 (PID: $(cat $PID_FILE))"
      exit 0
    fi

    echo "🚀 启动 AgentHub Server..."
    cd "$AGENTHUB_DIR"
    nohup node src/server.js > "$LOG_DIR/agenthub.log" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 2

    if kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
      echo "✅ Server 启动成功 (PID: $(cat $PID_FILE))"
    else
      echo "❌ Server 启动失败，查看: cat $LOG_DIR/agenthub.log"
      exit 1
    fi

    echo "🌐 启动 Cloudflare Tunnel..."
    nohup cloudflared tunnel --url http://localhost:8080 > "$LOG_DIR/agenthub-tunnel.log" 2>&1 &
    echo $! > "$TUNNEL_PID_FILE"
    sleep 5

    # 获取tunnel URL
    TUNNEL_URL=$(grep -o "https://.*trycloudflare.com" "$LOG_DIR/agenthub-tunnel.log" | head -1)
    if [ -n "$TUNNEL_URL" ]; then
      echo "✅ Tunnel 启动成功"
      echo ""
      echo "=========================================="
      echo "📱 AgentHub 公网地址:"
      echo "   $TUNNEL_URL"
      echo "=========================================="
      echo ""
      echo "🔑 Health: $TUNNEL_URL/health"
    else
      echo "⚠️ Tunnel 启动中，稍后查看: cat $LOG_DIR/agenthub-tunnel.log"
    fi
    ;;
  stop)
    echo "🛑 停止 AgentHub..."
    [ -f "$PID_FILE" ] && kill "$(cat $PID_FILE)" 2>/dev/null && rm -f "$PID_FILE"
    [ -f "$TUNNEL_PID_FILE" ] && kill "$(cat $TUNNEL_PID_FILE)" 2>/dev/null && rm -f "$TUNNEL_PID_FILE"
    pkill -f "node src/server.js" 2>/dev/null
    pkill -f "cloudflared tunnel --url http://localhost:8080" 2>/dev/null
    echo "✅ 已停止"
    ;;
  status)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
      echo "✅ Server 运行中 (PID: $(cat $PID_FILE))"
    else
      echo "❌ Server 未运行"
    fi
    if [ -f "$TUNNEL_PID_FILE" ] && kill -0 "$(cat $TUNNEL_PID_FILE)" 2>/dev/null; then
      echo "✅ Tunnel 运行中 (PID: $(cat $TUNNEL_PID_FILE))"
      TUNNEL_URL=$(grep -o "https://.*trycloudflare.com" "$LOG_DIR/agenthub-tunnel.log" | head -1)
      [ -n "$TUNNEL_URL" ] && echo "🌐 $TUNNEL_URL"
    else
      echo "❌ Tunnel 未运行"
    fi
    ;;
  restart)
    $0 stop
    sleep 2
    $0 start
    ;;
  *)
    echo "用法: $0 {start|stop|restart|status}"
    ;;
esac
