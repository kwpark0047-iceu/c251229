# 간단한 CMD 실행 스크립트

@echo off
cd /d f:\c251229
set PATH=C:\Program Files\nodejs;C:\Windows\system32
echo 개발 서버 시작...
"C:\Program Files\nodejs\npm.cmd" run dev
pause
