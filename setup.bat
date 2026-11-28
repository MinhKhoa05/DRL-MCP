@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
echo ===================================================
echo     DRL-MCP - All-in-One Automated Setup
echo ===================================================
echo.

:: 1. KIỂM TRA & TỰ ĐỘNG CÀI ĐẶT NODE.JS (NẾU CHƯA CÓ)
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Chưa tìm thấy Node.js. Đang tự động tải và cài đặt Node.js qua winget...
    winget install OpenJS.NodeJS -e --silent --accept-source-agreements --accept-package-agreements
    if %errorlevel% neq 0 (
        echo [ERROR] Không thể tự cài Node.js. Vui lòng tải tại: https://nodejs.org
        pause
        exit /b 1
    )
    echo [+] Đã cài xong Node.js!
) else (
    echo [OK] Node.js đã sẵn sàng.
)

:: 2. KIỂM TRA & TỰ ĐỘNG CÀI ĐẶT PYTHON (NẾU CHƯA CÓ)
set PY_CMD=
where python >nul 2>nul
if %errorlevel% equ 0 (
    set PY_CMD=python
) else (
    where py >nul 2>nul
    if %errorlevel% equ 0 (
        set PY_CMD=py
    )
)

if "%PY_CMD%"=="" (
    echo [!] Chưa tìm thấy Python. Đang tự động tải và cài đặt Python qua winget...
    winget install Python.Python.3.12 -e --silent --accept-source-agreements --accept-package-agreements
    if %errorlevel% neq 0 (
        echo [ERROR] Không thể tự cài Python. Vui lòng tải tại: https://python.org
        pause
        exit /b 1
    )
    echo [+] Đã cài xong Python!
    set PY_CMD=python
) else (
    echo [OK] Python đã sẵn sàng (%PY_CMD%).
)

:: 3. KIỂM TRA GIT (CẦN CHO PIP CÀI TỪ GITHUB)
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Chưa có Git. Đang tự động cài Git qua winget để hỗ trợ cài thư viện fbgql...
    winget install Git.Git -e --silent --accept-source-agreements --accept-package-agreements
)

:: 4. CÀI ĐẶT CÁC DEPENDENCY CỦA DỰ ÁN
echo.
echo [+] Đang cài đặt thư viện Node.js (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install thất bại.
    pause
    exit /b 1
)

echo.
echo [+] Đang tự động cài thư viện cào Facebook fbgql...
%PY_CMD% -m pip install --upgrade "git+https://github.com/bsho5/fbgql.git"
if %errorlevel% neq 0 (
    echo [!] Thử cài qua pip fallback...
    %PY_CMD% -m pip install httpx requests click
    %PY_CMD% -m pip install "git+https://github.com/bsho5/fbgql.git"
)

echo.
echo ===================================================
echo  [HOÀN TẤT] Hệ thống đã sẵn sàng 100%!
echo  Thư mục: %~dp0
echo ===================================================
echo.
pause
