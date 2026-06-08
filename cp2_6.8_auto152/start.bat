@echo off
echo ========================================
echo   协作白板应用 - 启动脚本
echo ========================================
echo.

echo [1/3] 检查并创建虚拟环境...
if not exist "venv" (
    echo 创建Python虚拟环境...
    python -m venv venv
)

echo.
echo [2/3] 安装后端依赖...
call venv\Scripts\activate
pip install -r requirements.txt

echo.
echo [3/3] 安装前端依赖...
call npm install

echo.
echo ========================================
echo   启动服务...
echo ========================================
echo.

start "后端服务" cmd /k "call venv\Scripts\activate && python server.py"
timeout /t 3 /nobreak >nul

echo.
echo 后端服务已启动 (http://localhost:8000)
echo 正在启动前端开发服务器...
echo.

call npm run dev
