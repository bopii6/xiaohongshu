@echo off
REM xiaohongshu-mcp 快速安装脚本
REM 下载并安装 xiaohongshu-mcp Windows 版本

echo ====================================
echo xiaohongshu-mcp 安装脚本
echo ====================================

set INSTALL_DIR=%~dp0
set VERSION=latest

echo.
echo 正在下载 xiaohongshu-mcp...
echo.

REM 创建目录
if not exist "%INSTALL_DIR%bin" mkdir "%INSTALL_DIR%bin"

REM 下载主程序
echo 下载: xiaohongshu-mcp-windows-amd64.exe
curl -L -o "%INSTALL_DIR%bin\xiaohongshu-mcp.exe" "https://github.com/xpzouying/xiaohongshu-mcp/releases/latest/download/xiaohongshu-mcp-windows-amd64.exe"

REM 下载登录工具
echo 下载: xiaohongshu-login-windows-amd64.exe
curl -L -o "%INSTALL_DIR%bin\xiaohongshu-login.exe" "https://github.com/xpzouying/xiaohongshu-mcp/releases/latest/download/xiaohongshu-login-windows-amd64.exe"

echo.
echo ====================================
echo 安装完成!
echo ====================================
echo.
echo 使用方法:
echo.
echo 1. 首次登录 (需要扫码):
echo    .\bin\xiaohongshu-login.exe
echo.
echo 2. 启动 MCP 服务:
echo    .\bin\xiaohongshu-mcp.exe
echo.
echo 服务启动后将在 http://localhost:18060 提供 API
echo ====================================
echo.
pause
