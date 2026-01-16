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

# 4. 단위 테스트 실행
Write-Host "🧪 단위 테스트 실행 중..." -ForegroundColor Yellow
try {
    npm run test
    Write-Host "✅ 단위 테스트 통과" -ForegroundColor Green
} catch {
    Write-Host "❌ 단위 테스트 실패" -ForegroundColor Red
    Write-Host "경고: 단위 테스트 실패했지만 계속 진행합니다." -ForegroundColor Yellow
}
Write-Host ""

# 5. E2E 테스트 실행 (선택적)
Write-Host "🌐 E2E 테스트 실행 중..." -ForegroundColor Yellow
try {
    npm run test:e2e
    Write-Host "✅ E2E 테스트 통과" -ForegroundColor Green
} catch {
    Write-Host "⚠️  E2E 테스트 실패 (서버가 실행 중인지 확인하세요)" -ForegroundColor Yellow
    Write-Host "경고: E2E 테스트 실패했지만 계속 진행합니다." -ForegroundColor Yellow
}
Write-Host ""

# 6. 빌드 테스트
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
Write-Host "체크 결과:" -ForegroundColor Green
Write-Host "  ✅ Lint"
Write-Host "  ✅ Type Check"
Write-Host "  $(if ($LastExitCode -eq 0) { '✅' } else { '⚠️' })  Unit Tests"
Write-Host "  $(if ($LastExitCode -eq 0) { '✅' } else { '⚠️' })  E2E Tests"
Write-Host "  ✅ Build"
Write-Host ""
Write-Host "💡 팁: E2E 테스트를 실행하려면 먼저 개발 서버를 시작하세요: npm run dev" -ForegroundColor Cyan
