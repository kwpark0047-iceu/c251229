# 개발 서버 실행을 위한 PowerShell 스크립트 (한글 인코딩 문제 해결)

# 사용법:
# PowerShell에서 아래 명령어 실행
# powershell -ExecutionPolicy Bypass -File .\start-dev-encoding.ps1

# 또는 VS Code 터미널에서 직접 실행
# 1. VS Code 열기
# 2. Ctrl+Shift+` 로 통합 터미널 열기
# 3. 아래 명령어 입력 후 실행

# 인코딩 설정
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# 현재 작업 디렉토리 확인
$currentPath = Get-Location
Write-Host "현재 작업 디렉토리: $currentPath" -ForegroundColor Green

# 프로젝트 디렉토리로 이동
Set-Location "f:\c251229"
Write-Host "프로젝트 디렉토리 변경: f:\c251229" -ForegroundColor Green

try {
    Write-Host "개발 서버 시작..." -ForegroundColor Green
    
    # Node.js 버전 확인
    $nodeVersion = & "C:\Program Files\nodejs\node.exe" --version 2>$null
    Write-Host "Node.js 버전: $nodeVersion" -ForegroundColor Cyan
    
    # 개발 서버 시작
    $process = Start-Process -FilePath "node" -ArgumentList "f:\c251229\node_modules\.bin\next", "dev" -PassThru -Wait -NoNewWindow
    
    Write-Host "개발 서버 프로세스 ID: $($process.Id)" -ForegroundColor Green
    Write-Host "개발 서버 시작 완료" -ForegroundColor Green
    Write-Host "브라우저에서 http://localhost:3000 으로 접속하세요" -ForegroundColor Yellow
    
    # 프로세스가 종료될 때까지 대기
    $process.WaitForExit()
    
    Write-Host "개발 서버 종료" -ForegroundColor Green
    
} catch {
    Write-Host "오류 발생: $($_)" -ForegroundColor Red
    Write-Host "개발 서버 종료" -ForegroundColor Red
}

Write-Host "스크립트 실행 완료" -ForegroundColor Green
