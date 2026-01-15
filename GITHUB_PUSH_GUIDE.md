# GitHub 푸시 및 Actions 확인 가이드

## 📋 푸시할 파일 목록

다음 파일들이 GitHub에 커밋 및 푸시되어야 합니다:

### 필수 파일
- ✅ `.github/workflows/ci.yml`
- ✅ `.github/workflows/test-pipeline.yml`
- ✅ `scripts/test-pipeline.sh`
- ✅ `scripts/test-pipeline.ps1`
- ✅ `docs/PIPELINE.md`
- ✅ `package.json` (업데이트됨)
- ✅ `README.md` (업데이트됨)

## 🚀 GitHub에 푸시하는 방법

### 방법 1: Git 명령어 (터미널)

```bash
# 1. 변경사항 확인
git status

# 2. 모든 변경사항 추가
git add .

# 3. 커밋
git commit -m "feat: CI/CD 파이프라인 설정 추가

- GitHub Actions 워크플로우 추가 (ci.yml, test-pipeline.yml)
- 로컬 테스트 스크립트 추가 (PowerShell, Bash)
- 파이프라인 문서 추가
- package.json 스크립트 업데이트 (ci, type-check, lint:fix)
- README.md에 파이프라인 테스트 섹션 추가"

# 4. GitHub에 푸시
git push origin master
```

### 방법 2: GitHub Desktop

1. **GitHub Desktop 열기**
2. **변경사항 확인**
   - 왼쪽 패널에서 변경된 파일 확인
   - `.github/workflows/` 폴더 확인
3. **커밋 메시지 작성**
   ```
   feat: CI/CD 파이프라인 설정 추가
   ```
4. **커밋**
   - 하단 "Commit to master" 버튼 클릭
5. **푸시**
   - 상단 "Push origin" 버튼 클릭

### 방법 3: VS Code

1. **Source Control 탭 열기** (Ctrl+Shift+G)
2. **변경사항 확인**
   - 변경된 파일들이 표시됨
3. **스테이징**
   - 각 파일 옆의 "+" 버튼 클릭
   - 또는 "Changes" 옆의 "+" 버튼으로 모두 추가
4. **커밋**
   - 상단 커밋 메시지 입력란에 메시지 작성
   - "Commit" 버튼 클릭 (또는 Ctrl+Enter)
5. **푸시**
   - 상단 "Sync Changes" 또는 "Push" 버튼 클릭

## ✅ GitHub Actions에서 확인하기

### 1. Actions 탭으로 이동

1. GitHub 저장소로 이동: https://github.com/kwpark0047-iceu/c251229
2. 상단 메뉴에서 **"Actions"** 탭 클릭

### 2. 워크플로우 확인

푸시 후 다음 워크플로우들이 자동으로 실행됩니다:

#### CI Pipeline (자동 실행)
- **Lint Check** - 코드 스타일 검사
- **TypeScript Type Check** - 타입 오류 확인
- **Unit Tests** - 단위 테스트 실행
- **Build Check** - 빌드 테스트

#### Test Pipeline (자동 실행)
- **Full Pipeline Test** - 전체 파이프라인 통합 테스트

### 3. 실행 상태 확인

각 워크플로우 실행에서:
- ✅ **녹색 체크** = 성공
- ❌ **빨간색 X** = 실패
- 🟡 **노란색 원** = 진행 중

### 4. 로그 확인

1. 워크플로우 이름 클릭
2. 각 작업(job) 클릭
3. 각 단계(step)의 로그 확인 가능

## 🔧 수동으로 파이프라인 실행하기

### Test Pipeline 수동 실행

1. **Actions 탭**으로 이동
2. 왼쪽 사이드바에서 **"Test Pipeline"** 선택
3. 오른쪽 상단 **"Run workflow"** 버튼 클릭
4. 브랜치 선택 (master)
5. **"Run workflow"** 버튼 클릭

## 📊 예상 결과

### 성공적인 실행 시

```
✅ CI Pipeline
  ✅ Lint Check
  ✅ TypeScript Type Check
  ✅ Unit Tests
  ✅ Build Check

✅ Test Pipeline
  ✅ Full Pipeline Test
    ✅ Run linter
    ✅ Type check
    ✅ Run tests
    ✅ Build application
    ✅ Pipeline test summary
```

### 실패 시 확인사항

1. **환경 변수 설정 확인**
   - Settings → Secrets and variables → Actions
   - `NEXT_PUBLIC_SUPABASE_URL` 설정 확인
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정 확인

2. **로그 확인**
   - 실패한 작업 클릭
   - 에러 메시지 확인
   - 로컬에서 동일한 명령어 실행하여 재현

3. **파일 경로 확인**
   - `.github/workflows/` 폴더가 올바르게 푸시되었는지 확인
   - 파일 확장자가 `.yml`인지 확인

## 🎯 빠른 체크리스트

푸시 전 확인:
- [ ] `.github/workflows/ci.yml` 파일 존재
- [ ] `.github/workflows/test-pipeline.yml` 파일 존재
- [ ] `package.json`에 `ci`, `type-check` 스크립트 추가됨
- [ ] 커밋 메시지 작성됨

푸시 후 확인:
- [ ] GitHub Actions 탭에서 워크플로우 실행 확인
- [ ] 모든 작업이 성공적으로 완료되는지 확인
- [ ] 로그에서 오류가 없는지 확인

## 🔗 유용한 링크

- **저장소**: https://github.com/kwpark0047-iceu/c251229
- **Actions**: https://github.com/kwpark0047-iceu/c251229/actions
- **Settings**: https://github.com/kwpark0047-iceu/c251229/settings
- **Secrets**: https://github.com/kwpark0047-iceu/c251229/settings/secrets/actions

## 💡 팁

- 첫 실행은 약 2-5분 정도 소요될 수 있습니다
- 환경 변수가 설정되지 않아도 빌드 단계를 제외하고는 실행됩니다
- 로컬에서 `npm run ci`로 먼저 테스트하는 것을 권장합니다
