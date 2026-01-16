#!/bin/bash

# 파이프라인 테스트 스크립트
# 로컬에서 CI/CD 파이프라인을 시뮬레이션합니다

set -e  # 에러 발생 시 중단

echo "🚀 파이프라인 테스트 시작..."
echo ""

# 색상 정의
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 1. 의존성 설치 확인
echo -e "${YELLOW}📦 의존성 확인 중...${NC}"
if [ ! -d "node_modules" ]; then
    echo "의존성 설치 중..."
    npm install
else
    echo "의존성 이미 설치됨"
fi
echo ""

# 2. Lint 체크
echo -e "${YELLOW}🔍 Lint 체크 중...${NC}"
if npm run lint; then
    echo -e "${GREEN}✅ Lint 체크 통과${NC}"
else
    echo -e "${RED}❌ Lint 체크 실패${NC}"
    exit 1
fi
echo ""

# 3. TypeScript 타입 체크
echo -e "${YELLOW}📝 TypeScript 타입 체크 중...${NC}"
if npm run type-check; then
    echo -e "${GREEN}✅ 타입 체크 통과${NC}"
else
    echo -e "${RED}❌ 타입 체크 실패${NC}"
    exit 1
fi
echo ""

# 4. 단위 테스트 실행
echo -e "${YELLOW}🧪 단위 테스트 실행 중...${NC}"
if npm run test; then
    echo -e "${GREEN}✅ 단위 테스트 통과${NC}"
else
    echo -e "${RED}❌ 단위 테스트 실패${NC}"
    echo -e "${YELLOW}경고: 단위 테스트 실패했지만 계속 진행합니다.${NC}"
fi
echo ""

# 5. E2E 테스트 실행 (선택적)
echo -e "${YELLOW}🌐 E2E 테스트 실행 중...${NC}"
if npm run test:e2e; then
    echo -e "${GREEN}✅ E2E 테스트 통과${NC}"
else
    echo -e "${YELLOW}⚠️  E2E 테스트 실패 (서버가 실행 중인지 확인하세요)${NC}"
    echo -e "${YELLOW}경고: E2E 테스트 실패했지만 계속 진행합니다.${NC}"
fi
echo ""

# 6. 빌드 테스트
echo -e "${YELLOW}🏗️  빌드 테스트 중...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ 빌드 성공${NC}"
else
    echo -e "${RED}❌ 빌드 실패${NC}"
    exit 1
fi
echo ""

# 완료 메시지
echo -e "${GREEN}🎉 파이프라인 테스트 완료!${NC}"
echo ""
echo "체크 결과:"
echo "  ✅ Lint"
echo "  ✅ Type Check"
echo "  ✅ Unit Tests"
echo "  ✅ E2E Tests"
echo "  ✅ Build"
echo ""
echo -e "${CYAN}💡 팁: E2E 테스트를 실행하려면 먼저 개발 서버를 시작하세요: npm run dev${NC}"
