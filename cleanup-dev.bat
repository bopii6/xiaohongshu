@echo off
chcp 65001 >nul
echo 🧹 正在清理开发环境...

:: 1. 强制终止所有Node.js进程
echo 📊 终止Node.js进程...
taskkill /F /IM node.exe >nul 2>&1
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq node.exe" /fo csv ^| findstr /v "INFO"') do (
    taskkill /F /PID %%i >nul 2>&1
)

:: 2. 清理Next.js缓存和锁文件
echo 🗂️ 清理Next.js缓存...
if exist .next (
    rmdir /s /q .next
    echo   ✓ 已删除.next目录
)
echo 📋 清理临时文件...
if exist "*.tmp" del /q *.tmp >nul 2>&1
if exist "nul" del /q nul >nul 2>&1

:: 3. 检查并释放端口3000-3010
echo 🔌 检查并释放端口3000-3010...
for /l %%i in (3000,1,3010) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%i:"') do (
        if not "%%a"=="" (
            echo   ✓ 释放端口 %%i (进程 %%a)
            taskkill /F /PID %%a >nul 2>&1
        )
    )
)

:: 4. 额外清理 - 删除可能的锁文件
echo 🔓 清理锁文件...
if exist ".next\dev\lock" del /q ".next\dev\lock" >nul 2>&1

:: 5. 等待进程完全终止
echo ⏱ 等待进程完全终止...
timeout /t 3 /nobreak >nul

echo.
echo ✅ 开发环境清理完成！
echo.
echo 🚀 启动命令：
echo    npm run dev
echo.
echo 💡 提示：如果仍有端口冲突，请手动重启终端或运行：
echo    netstat -ano ^| findstr ":300"
echo.
pause