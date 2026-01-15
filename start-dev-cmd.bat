# 최종 해결책 - CMD에서 직접 실행

# Windows CMD에서 직접 실행하는 가장 확실한 방법

# 1. VS Code에서 CMD 터미널 열기
# - VS Code 열기
# - Ctrl+Shift+C 로 CMD 터미널 열기

# 2. 직접 명령어 실행
# 아래 명령어를 CMD에 붙여넣고 실행

@echo off
echo.
echo ========================================
echo     개발 서버 실행 최종 해결책
echo ========================================
echo.
echo 1. 현재 작업 디렉토리 확인
cd /d f:\c251229
echo 현재 디렉토리: %CD%
echo.
echo 2. Node.js 설치 확인
if exist "C:\Program Files\nodejs\node.exe" (
    echo ✅ Node.js 설치됨
) else (
    echo ❌ Node.js 설치 안됨
    echo 설치 후 다시 시도하세요
    pause
    exit /b
)
echo.
echo 3. PATH 환경변수 설정
set PATH=C:\Program Files\nodejs;C:\Windows\system32;C:\Windows\System32\Wbem;C:\Windows\System32\WindowsPowerShell\v1.0
echo PATH 설정 완료
echo.
echo 4. node_modules 정리
if exist node_modules (
    echo 🗑️ node_modules 정리 중...
    rmdir /s /q node_modules
    echo ✅ node_modules 정리 완료
) else (
    echo ℹ️ node_modules 없음
)
echo.
echo 5. package-lock.json 정리
if exist package-lock.json (
    echo 🗑️ package-lock.json 정리 중...
    del /q package-lock.json
    echo ✅ package-lock.json 정리 완료
) else (
    echo ℹ️ package-lock.json 없음
)
echo.
echo 6. npm 캐시 정리
echo 🗑️ npm 캐시 정리 중...
"C:\Program Files\nodejs\npm.cmd" cache clean --force
echo ✅ npm 캐시 정리 완료
echo.
echo 7. 의존성 설치
echo 📦 의존성 설치 중...
"C:\Program Files\nodejs\npm.cmd" install
echo ✅ 의존성 설치 완료
echo.
echo 8. 개발 서버 시작
echo 🚀 개발 서버 시작 중...
"C:\Program Files\nodejs\npm.cmd" run dev
echo.
echo ========================================
echo     개발 서버 실행 완료
echo ========================================
echo.
echo 브라우저에서 http://localhost:3000 으로 접속하세요
echo.
pause
