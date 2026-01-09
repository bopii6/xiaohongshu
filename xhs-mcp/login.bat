@echo off
REM 登录小红书账号

set SCRIPT_DIR=%~dp0

echo ====================================
echo 登录小红书账号
echo ====================================

if not exist "%SCRIPT_DIR%bin\xiaohongshu-login.exe" (
    echo 错误: 未找到 xiaohongshu-login.exe
    echo 请先运行 install.bat 安装
    pause
    exit /b 1
)

echo.
echo 即将打开浏览器，请扫码登录小红书
echo.

cd /d "%SCRIPT_DIR%"
.\bin\xiaohongshu-login.exe

echo.
echo 登录完成后，请运行 start.bat 启动服务
pause
