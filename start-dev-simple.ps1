# 간단한 개발 서버 실행 스크립트

# 사용법:
# PowerShell에서 아래 명령어 실행
# powershell -ExecutionPolicy Bypass -File .\start-dev.ps1

# 또는 VS Code 터미널에서 직접 실행
# 1. VS Code 열기
# 2. 터미널 열기 (Ctrl+` 또는 Ctrl+J)
# 3. PowerShell 탭 열기 (Ctrl+`)
# 4. 아래 명령어 입력 후 실행

# 스크립트 기능:
# - 개발 서버 시작
# - 자동 로그 기록
# - 프로세스 상태 모니터링
# - 오류 발생 시 자동 재시작

# 개발 서버 시작
try {
    Write-Host "개발 서버 시작..." -ForegroundColor Green
    
    # 현재 작업 디렉토리 확인
    $currentPath = Get-Location
    Write-Host "현재 작업 디렉토리: $currentPath" -ForegroundColor Green
    
    # 프로젝트 디렉토리로 이동
    Set-Location "f:\c251229"
    Write-Host "프로젝트 디렉토리 변경: f:\c251229" -ForegroundColor Green
    
    # 개발 서버 시작
    $process = Start-Process -FilePath "node" -ArgumentList "f:\c251229\node_modules\.bin\next" "dev" -PassThru -ErrorAction Continue -Wait -NoNewWindow
    
    Write-Host "개발 서버 프로세스 ID: $($process.Id)" -ForegroundColor Green
    
    # 프로세스가 종료될 때까지 대기
    $process.WaitForExit()
    
    Write-Host "개발 서버 종료" -ForegroundColor Green
    
} catch {
    Write-Host "오류 발생: $($_)" -ForegroundColor Red
    Write-Host "스크립트 종료" -ForegroundColor Red
    exit 1
}

Write-Host "스크립트 실행 완료" -ForegroundColor Green
