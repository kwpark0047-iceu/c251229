# CI/CD 파이프라인 테스트 가이드

## 개요

이 프로젝트는 GitHub Actions를 사용한 CI/CD 파이프라인을 포함하고 있습니다.

## 파이프라인 구성

### 1. GitHub Actions 워크플로우

#### `.github/workflows/ci.yml`
- **트리거**: `main`, `develop` 브랜치에 push 또는 PR 생성 시
- **작업**:
  - Lint 체크
  - TypeScript 타입 체크
  - 단위 테스트 실행
  - 빌드 테스트

#### `.github/workflows/test-pipeline.yml`
- **트리거**: 수동 실행 또는 push/PR 시
- **작업**: 전체 파이프라인 테스트 (통합)

### 2. 로컬 테스트 스크립트

#### Windows (PowerShell)
```powershell
.\scripts\archive\test-pipeline.ps1
```

#### Linux/Mac (Bash)
```bash
chmod +x scripts/archive/test-pipeline.sh
./scripts/archive/test-pipeline.sh
```

#### npm 스크립트 사용
```bash
npm run ci
```

## 파이프라인 단계

### 1. Lint 체크
```bash
npm run lint
```
- ESLint를 사용하여 코드 스타일 및 품질 검사
- 자동 수정: `npm run lint:fix`

### 2. TypeScript 타입 체크
```bash
npm run type-check
```
- 타입 오류 확인 (빌드 없이)

### 3. 단위 테스트
```bash
npm run test
```
- Vitest를 사용한 테스트 실행
- Watch 모드: `npm run test:watch`
- 커버리지: `npm run test:coverage`

### 4. 빌드 테스트
```bash
npm run build
```
- Next.js 프로덕션 빌드 확인

## 환경 변수 설정

GitHub Actions에서 다음 환경 변수를 설정해야 합니다:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Anon Key

**설정 방법:**
1. GitHub 저장소 → Settings → Secrets and variables → Actions
2. New repository secret 추가

## 파이프라인 테스트 실행

### 로컬에서 테스트

1. **전체 파이프라인 테스트**
   ```bash
   npm run ci
   ```

2. **개별 단계 테스트**
   ```bash
   # Lint만 실행
   npm run lint
   
   # 타입 체크만 실행
   npm run type-check
   
   # 테스트만 실행
   npm run test
   
   # 빌드만 실행
   npm run build
   ```

### GitHub Actions에서 테스트

1. **자동 실행**
   - `main` 또는 `develop` 브랜치에 push
   - Pull Request 생성

2. **수동 실행**
   - GitHub 저장소 → Actions 탭
   - "Test Pipeline" 워크플로우 선택
   - "Run workflow" 클릭

## 파이프라인 상태 확인

### GitHub Actions
- 저장소의 Actions 탭에서 실행 상태 확인
- 각 작업의 로그 확인 가능

### 로컬 실행 결과
```
🚀 파이프라인 테스트 시작...

📦 의존성 확인 중...
의존성 이미 설치됨

🔍 Lint 체크 중...
✅ Lint 체크 통과

📝 TypeScript 타입 체크 중...
✅ 타입 체크 통과

🧪 테스트 실행 중...
✅ 테스트 통과

🏗️  빌드 테스트 중...
✅ 빌드 성공

🎉 파이프라인 테스트 완료!

모든 체크 통과:
  ✅ Lint
  ✅ Type Check
  ✅ Tests
  ✅ Build
```

## 문제 해결

### Lint 오류
```bash
# 자동 수정 시도
npm run lint:fix

# 특정 파일만 체크
npx eslint src/app/lead-manager/page.tsx
```

### 타입 오류
```bash
# 타입 체크 실행
npm run type-check

# 특정 파일 타입 체크
npx tsc --noEmit src/app/lead-manager/page.tsx
```

### 테스트 실패
```bash
# 상세 로그와 함께 실행
npm run test -- --reporter=verbose

# 특정 테스트 파일만 실행
npm run test src/app/shared/constants.test.ts
```

### 빌드 실패
```bash
# 상세 로그 확인
npm run build -- --debug

# .next 폴더 삭제 후 재빌드
rm -rf .next
npm run build
```

## CI/CD 체크리스트

배포 전 확인사항:

- [ ] `npm run lint` 통과
- [ ] `npm run type-check` 통과
- [ ] `npm run test` 통과
- [ ] `npm run build` 성공
- [ ] GitHub Actions 파이프라인 통과

## 추가 리소스

- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)
- [Vitest 문서](https://vitest.dev/)
- [ESLint 문서](https://eslint.org/)
