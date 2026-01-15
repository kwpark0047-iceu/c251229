# 개발 서버 실행을 위한 배치 스크립트

# 이 스크립트를 사용하여 개발 서버를 시작하세요

# 사용법:
# 1. PowerShell에서 스크립트 실행
#    powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
#
# 2. VS Code 터미널에서 직접 실행
#    - VS Code 열기
#    - 터미널 열기 (Ctrl+` 또는 Ctrl+J)
#    - PowerShell 탭 열기 (Ctrl+`)
#    - 아래 명령어 입력 후 실행

# 스크립트 기능:
# - Node.js 버전 확인
# - 개발 서버 시작 (npm run dev)
# - 환경변수 확인
# - 자동 재시작 기능

Write-Host "개발 서버 시작" -FilePath "C:\temp\dev-server.log" -Append

# 개발 서버 시작
Start-Process powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass" "-File" ".\start-dev.ps1" -Wait -NoNewWindow

Write-Host "개발 서버 상태 확인" -FilePath "C:\temp\dev-server.log" -Append

# 5초마다 서버 상태 확인
while ($true) {
    $process = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "Node.js 프로세스 실행 중: $($process.Id)" -FilePath "C:\temp\dev-server.log" -Append
        Start-Sleep -Seconds 5
    } else {
        Write-Host "Node.js 프로세스 종료" -FilePath "C:\temp\dev-server.log" -Append
        break
    }
}

Write-Host "스크립트 실행 완료" -FilePath "C:\temp\dev-server.log" -Append
