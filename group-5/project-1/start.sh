#!/bin/bash
# M5-RA 研报智能分析助手 — 一键启动脚本
# 对齐 Spec 08 §6：Flask :5000 + Vite :5173

echo "========================================="
echo "  M5-RA 研报智能分析助手 启动中..."
echo "========================================="

# 启动后端
echo "[1/2] 启动 Flask 后端 (port 5000)..."
cd "$(dirname "$0")/backend"
cp -n .env.example .env 2>/dev/null || true
pip3 install -r requirements.txt -q
python app.py &
BACKEND_PID=$!

# 启动前端
echo "[2/2] 启动 Vite 前端 (port 5173)..."
cd "$(dirname "$0")/frontend"
npm install --silent
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "  后端: http://localhost:5000"
echo "  前端: http://localhost:5173"
echo "  按 Ctrl+C 停止所有服务"
echo "========================================="

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
