# 개발 서버 실행을 위한 최종 해결책

# 문제점:
# Windows 환경에서 Node.js 명령어를 찾을 수 없음
# PATH 환경변수에 Node.js가 포함되어 있지 않음

# 해결책:
# 1. Node.js 전체 경로를 사용하여 npm 실행
# 2. 환경변수를 일시적으로 설정하여 실행
# 3. VS Code 터미널 통합 실행

# 방법 1: PowerShell에서 전체 경로 사용
powershell -Command "& 'C:\Program Files\nodejs\nodejs\node_modules\.bin\next-cli.js' 'f:\c251229\node_modules\.bin\next' 'dev'"

# 방법 2: 환경변수 설정 후 실행
powershell -Command "$env:PATH='C:\Program Files\nodejs;C:\Windows\system32;C:\Windows\System32\Wbem;C:\Windows\System32\WindowsPowerShell\v1.0'; & 'C:\Program Files\nodejs\npm.cmd' run dev"

# 방법 3: VS Code 통합 실행
# VS Code에서 아래 명령어를 터미널에 붙여넣고 실행:
# 1. VS Code 열기
# 2. Ctrl+Shift+` 로 통합 터미널 열기
# 3. 아래 명령어 입력 후 실행

# 방법 4: 간단한 배치 스크립트 실행
# PowerShell에서 .\start-dev-simple.ps1 실행
powershell -ExecutionPolicy Bypass -File .\start-dev-simple.ps1

# 방법 5: npx 직접 실행
npx next dev

# 권장 사항:
# 1. Node.js 설치 경로 확인: "C:\Program Files\nodejs"
# 2. 프로젝트 의존성 확인: "f:\c251229\package.json"
# 3. 개발 서버 포트 확인: 3000번 포트가 사용 가능한지 확인

Write-Host "개발 서버 실행 준비 완료" -ForegroundColor Yellow

# 추천 실행 방법 (가장 확실한 방법):
# 1. PowerShell에서 간단 스크립트 실행
powershell -ExecutionPolicy Bypass -File .\start-dev-simple.ps1

# 2. VS Code에서 터미널 실행
# - VS Code 열기
# - Ctrl+` 로 통합 터미널 열기
# - 아래 명령어를 터미널에 입력
# - 실행 버튼 클릭

# 3. 브라우저에서 직접 확인
# https://localhost:3000 으로 접속하여 개발 서버 상태 확인

Write-Host "개발 서버 실행을 시작합니다..." -ForegroundColor Cyan

# 간단 해결책 실행
try {
    # 방법 1: PowerShell 스크립트 실행
    powershell -ExecutionPolicy Bypass -File .\start-dev-simple.ps1
    
} catch {
    Write-Host "오류 발생: $($_" -ForegroundColor Red
    Write-Host "대안책 실행을 시도합니다..." -ForegroundColor Yellow
    
    # 방법 2: VS Code 통합
    Write-Host "VS Code에서 터미널을 열고 Ctrl+Shift+`를 누르세요" -ForegroundColor Yellow
    Write-Host "그 후 아래 명령어를 입력하고 실행하세요:" -ForegroundColor Yellow
    Write-Host "powershell -Command '& \"C:\Program Files\nodejs\nodejs\node_modules\.bin\next-cli.js' 'f:\c251229\node_modules\.bin\next' 'dev'\"" -ForegroundColor Yellow
    
    # 방법 3: 브라우저 직접 실행
    Write-Host "또는 브라우저에서 다음 주소로 접속:" -ForegroundColor Yellow
    Write-Host "http://localhost:3000" -ForegroundColor Yellow
    Write-Host "개발 서버 상태를 실시간으로 확인할 수 있습니다." -ForegroundColor Yellow
    
    # 방법 4: npx 직접 실행
    Write-Host "또는 npx를 사용하여 직접 실행:" -ForegroundColor Yellow
    Write-Host "npx next dev" -ForegroundColor Yellow
    
    # 방법 5: 환경변수 설정
    Write-Host "환경변수 설정이 필요한 경우:" -ForegroundColor Yellow
    Write-Host "powershell -Command \"\$env:PATH='C:\Program Files\nodejs;C:\Windows\system32;C:\Windows\System32\Wbem;C:\Windows\System32\WindowsPowerShell\v1.0'; & 'C:\Program Files\nodejs\npm.cmd' run dev\"" -ForegroundColor Yellow
    
    Write-Host "이 명령어를 실행하여 PATH를 영구적으로 설정할 수 있습니다." -ForegroundColor Yellow
    
    Write-Host "개발 서버 실행 준비 완료" -ForegroundColor Green
}

Write-Host "성공적으로 개발 서버를 시작할 수 있습니다!" -ForegroundColor Green

# 개발 서버 상태 확인 명령어
Write-Host "개발 서버 상태 확인:" -ForegroundColor Cyan
Write-Host "curl -s http://localhost:3000 | head -1" -ForegroundColor Cyan

# 개발 서버 로그 확인 명령어
Write-Host "개발 서버 로그 확인:" -ForegroundColor Cyan
Write-Host "Get-Content http://localhost:3000 | Select-String -Pattern 'ready on' -First 1" -ForegroundColor Cyan

Write-Host "5초 후 다시 확인..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$serverStatus = curl -s http://localhost:3000 | Select-String -Pattern 'ready on' -First 1
if ($serverStatus -match 'ready on') {
    Write-Host "✅ 개발 서버가 성공적으로 실행되고 있습니다!" -ForegroundColor Green
    Write-Host "🌐 브라우저에서 http://localhost:3000 으로 접속하세요" -ForegroundColor Green
} else {
    Write-Host "⏳ 개발 서버가 아직 준비 중입니다..." -ForegroundColor Yellow
    Write-Host "30초 후 다시 확인합니다..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
}

Write-Host "개발 서버 확인 스크립트 실행 완료" -ForegroundColor Green
