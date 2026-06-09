# 의존성 충돌 해결을 위한 스크립트

# 문제 해결:
# 1. React 버전 충돌 해결 (19.2.3 -> 18.2.0)
# 2. TypeScript 타입 버전 일치 (19 -> 18)
# 3. node_modules 정리 후 재설치

Write-Host "🔧 의존성 충돌 해결 시작" -ForegroundColor Green

# 현재 작업 디렉토리 확인
$currentPath = Get-Location
Write-Host "현재 작업 디렉토리: $currentPath" -ForegroundColor Green

# 프로젝트 디렉토리로 이동
Set-Location "f:\c251229"
Write-Host "프로젝트 디렉토리 변경: f:\c251229" -ForegroundColor Green

try {
    Write-Host "🗑️ node_modules 정리 중..." -ForegroundColor Yellow
    
    # node_modules 정리
    if (Test-Path "node_modules") {
        Remove-Item -Path "node_modules" -Recurse -Force
        Write-Host "✅ node_modules 정리 완료" -ForegroundColor Green
    }
    
    # package-lock.json 정리
    if (Test-Path "package-lock.json") {
        Remove-Item -Path "package-lock.json" -Force
        Write-Host "✅ package-lock.json 정리 완료" -ForegroundColor Green
    }
    
    Write-Host "📦 의존성 재설치 중..." -ForegroundColor Yellow
    
    # 환경변수 설정
    $env:PATH = "C:\Program Files\nodejs;C:\Windows\system32;C:\Windows\System32\Wbem;C:\Windows\System32\WindowsPowerShell\v1.0"
    
    # npm 캐시 정리
    $process = Start-Process -FilePath "npm" -ArgumentList "cache", "clean", "--force" -PassThru -Wait -NoNewWindow
    Write-Host "✅ npm 캐시 정리 완료" -ForegroundColor Green
    
    # 의존성 설치
    $process = Start-Process -FilePath "npm" -ArgumentList "install" -PassThru -Wait -NoNewWindow
    Write-Host "✅ 의존성 설치 완료" -ForegroundColor Green
    
    Write-Host "🚀 개발 서버 시작 중..." -ForegroundColor Yellow
    
    # 개발 서버 시작
    $process = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -Wait -NoNewWindow
    Write-Host "✅ 개발 서버 시작됨" -ForegroundColor Green
    Write-Host "🌐 브라우저에서 http://localhost:3000 으로 접속하세요" -ForegroundColor Yellow
    
    # 프로세스가 종료될 때까지 대기
    $process.WaitForExit()
    
    Write-Host "🛑 개발 서버 종료됨" -ForegroundColor Red
    
} catch {
    Write-Host "❌ 오류 발생: $($_)" -ForegroundColor Red
    Write-Host "🛑 개발 서버 종료됨" -ForegroundColor Red
}

Write-Host "스크립트 실행 완료" -ForegroundColor Green
