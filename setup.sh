#!/usr/bin/env bash
set -e

echo "==================================================="
echo "    DRL-MCP - All-in-One Automated Setup"
echo "==================================================="
echo ""

# 1. Tự động kiểm tra & cài đặt Node.js
if ! command -v node &> /dev/null; then
    echo "[!] Chưa có Node.js, đang tự động cài đặt..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y nodejs npm
    elif command -v brew &> /dev/null; then
        brew install node
    else
        echo "[ERROR] Không thể tự cài Node.js, vui lòng cài đặt thủ công."
        exit 1
    fi
else
    echo "[OK] Node.js đã sẵn sàng."
fi

# 2. Tự động kiểm tra & cài đặt Python
PY_CMD=""
if command -v python3 &> /dev/null; then
    PY_CMD="python3"
elif command -v python &> /dev/null; then
    PY_CMD="python"
else
    echo "[!] Chưa có Python, đang tự động cài đặt..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y python3 python3-pip git
        PY_CMD="python3"
    elif command -v brew &> /dev/null; then
        brew install python git
        PY_CMD="python3"
    else
        echo "[ERROR] Không thể tự cài Python, vui lòng cài đặt thủ công."
        exit 1
    fi
fi
echo "[OK] Python đã sẵn sàng ($PY_CMD)."

# 3. Cài đặt Node dependencies
echo ""
echo "[+] Đang chạy npm install..."
npm install

# 4. Cài đặt thư viện fbgql
echo ""
echo "[+] Đang cài đặt thư viện cào Facebook fbgql..."
$PY_CMD -m pip install --upgrade "git+https://github.com/bsho5/fbgql.git"

echo ""
echo "==================================================="
echo " [HOÀN TẤT] DRL-MCP đã sẵn sàng 100%!"
echo " Thư mục: $(pwd)"
echo "==================================================="
