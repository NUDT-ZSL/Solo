#!/bin/bash

echo "========================================"
echo "  协作白板应用 - 启动脚本"
echo "========================================"
echo ""

echo "[1/3] 检查并创建虚拟环境..."
if [ ! -d "venv" ]; then
    echo "创建Python虚拟环境..."
    python3 -m venv venv
fi

echo ""
echo "[2/3] 安装后端依赖..."
source venv/bin/activate
pip install -r requirements.txt

echo ""
echo "[3/3] 安装前端依赖..."
npm install

echo ""
echo "========================================"
echo "  启动服务..."
echo "========================================"
echo ""

python server.py &
SERVER_PID=$!
sleep 3

echo ""
echo "后端服务已启动 (http://localhost:8000)"
echo "正在启动前端开发服务器..."
echo ""

npm run dev

kill $SERVER_PID 2>/dev/null
