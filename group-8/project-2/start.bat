@echo off
chcp 65001 >nul
title 投研问答助手

echo ================================
echo   投研问答助手 - 启动中...
echo ================================
echo.

REM 清理可能残留的旧进程
echo [0/2] 清理旧进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5174 " ^| findstr "LISTENING"') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo       旧进程已清理
echo.

REM 启动后端
echo [1/2] 启动 Flask 后端 (端口 5000)...
cd /d "%~dp0backend"
start "Flask Backend" cmd /c "chcp 65001 >nul && python -m flask --app wsgi run --port 5000"

REM 等待后端启动
timeout /t 2 /nobreak >nul

REM 启动前端
echo [2/2] 启动 Vite 前端 (端口 5173)...
cd /d "%~dp0frontend"
start "Vite Frontend" cmd /c "chcp 65001 >nul && npm run dev"

REM 等待前端启动
timeout /t 3 /nobreak >nul

echo.
echo ================================
echo   启动完成！
echo.
echo   后端 API:  http://localhost:5000
echo   Swagger:   http://localhost:5000/apidocs/
echo   前端界面:  http://localhost:5173
echo ================================
echo.

REM 自动打开浏览器
start "" "http://localhost:5173"

echo 按任意键关闭此窗口（后端和前端将继续运行）...
pause >nul
