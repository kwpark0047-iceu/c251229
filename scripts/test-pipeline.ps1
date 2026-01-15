# 파이프라인 테스트 스크립트 (PowerShell)
# 로컬에서 CI/CD 파이프라인을 시뮬레이션합니다

$ErrorActionPreference = "Stop"

Write-Host "🚀 파이프라인 테스트 시작..." -ForegroundColor Cyan
Write-Host ""

# 1. 의존성 설치 확인
Write-Host "📦 의존성 확인 중..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "의존성 설치 중..."
    npm install
} else {
    Write-Host "의존성 이미 설치됨" -ForegroundColor Green
}
Write-Host ""

# 2. Lint 체크
Write-Host "🔍 Lint 체크 중..." -ForegroundColor Yellow
try {
    npm run lint
    Write-Host "✅ Lint 체크 통과" -ForegroundColor Green
} catch {
    Write-Host "❌ Lint 체크 실패" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 3. TypeScript 타입 체크
Write-Host "📝 TypeScript 타입 체크 중..." -ForegroundColor Yellow
try {
    npm run type-check
    Write-Host "✅ 타입 체크 통과" -ForegroundColor Green
} catch {
    Write-Host "❌ 타입 체크 실패" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 4. 테스트 실행
Write-Host "🧪 테스트 실행 중..." -ForegroundColor Yellow
try {
    npm run test
    Write-Host "✅ 테스트 통과" -ForegroundColor Green
} catch {
    Write-Host "❌ 테스트 실패" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 5. 빌드 테스트
Write-Host "🏗️  빌드 테스트 중..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "✅ 빌드 성공" -ForegroundColor Green
} catch {
    Write-Host "❌ 빌드 실패" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 완료 메시지
Write-Host "🎉 파이프라인 테스트 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "모든 체크 통과:" -ForegroundColor Green
Write-Host "  ✅ Lint"
Write-Host "  ✅ Type Check"
Write-Host "  ✅ Tests"
Write-Host "  ✅ Build"
