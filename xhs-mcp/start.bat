@echo off
REM 启动 xiaohongshu-mcp 服务

set SCRIPT_DIR=%~dp0

echo ====================================
echo 启动 xiaohongshu-mcp 服务
echo ====================================

if not exist "%SCRIPT_DIR%bin\xiaohongshu-mcp.exe" (
    echo 错误: 未找到 xiaohongshu-mcp.exe
    echo 请先运行 install.bat 安装
    pause
    exit /b 1
)

echo.
echo 服务地址: http://localhost:18060
echo 按 Ctrl+C 停止服务
echo.

cd /d "%SCRIPT_DIR%"
.\bin\xiaohongshu-mcp.exe
