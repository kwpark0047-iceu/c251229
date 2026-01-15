# 개발 서버 실행을 위한 PowerShell 스크립트

# 방법 1: VS Code 터미널에서 직접 실행
# VS Code를 열고 터미널에서 아래 명령어 실행
# PowerShell:
powershell -Command "cd 'f:\c251229'; npm run dev"

# 방법 2: PowerShell 스크립트 파일 실행
# 아래 내용을 start-dev.ps1 파일로 저장 후 실행
# PowerShell:
# .\start-dev.ps1

# 방법 3: 환경변수 확인 및 설정
# PowerShell:
# node --version
# npm --version
# echo $PATH

# 방법 4: Node.js 직접 실행
# PowerShell:
# "C:\Program Files\nodejs\node.exe" "f:\c251229\node_modules\next\bin\next-cli.js" "f:\c251229\node_modules\.bin\next" "dev"

Write-Host "Start-DevServer.ps1" -FilePath "C:\temp\start-dev.ps1" -Force

# 스크립트 실행
# PowerShell:
# C:\temp\start-dev.ps1

# Node.js 설치 확인
# PowerShell:
# Get-Command node
# Get-Command npm

# 전체 경로를 사용한 npm 실행
# PowerShell:
# $env:PATH="C:\Program Files\nodejs"; npm run dev

# 또는
# PowerShell:
# $env:PATH="C:\Program Files\nodejs;C:\Windows\system32;C:\Windows\System32\Wbem;C:\Windows\System32\WindowsPowerShell\v1.0"; npm run dev
