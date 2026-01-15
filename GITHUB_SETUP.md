# GitHub 저장소 CI/CD 파이프라인 설정 가이드

## 생성된 파일 목록

다음 파일들이 생성되었으며, GitHub 저장소에 커밋 및 푸시가 필요합니다:

### 1. GitHub Actions 워크플로우
- `.github/workflows/ci.yml` - 기본 CI 파이프라인
- `.github/workflows/test-pipeline.yml` - 통합 테스트 파이프라인

### 2. 로컬 테스트 스크립트
- `scripts/test-pipeline.sh` - Linux/Mac용 Bash 스크립트
- `scripts/test-pipeline.ps1` - Windows용 PowerShell 스크립트

### 3. 문서
- `docs/PIPELINE.md` - 파이프라인 테스트 가이드

### 4. 업데이트된 파일
- `package.json` - 새로운 스크립트 추가 (`ci`, `type-check`, `lint:fix`)
- `README.md` - 파이프라인 테스트 섹션 추가

## GitHub에 푸시하는 방법

### 1. Git 명령어 사용 (터미널)

```bash
# 변경사항 확인
git status

# 모든 변경사항 추가
git add .

# 또는 특정 파일만 추가
git add .github/workflows/
git add scripts/
git add docs/PIPELINE.md
git add package.json
git add README.md

# 커밋
git commit -m "feat: CI/CD 파이프라인 설정 추가

- GitHub Actions 워크플로우 추가
- 로컬 테스트 스크립트 추가
- 파이프라인 문서 추가
- package.json 스크립트 업데이트"

# GitHub에 푸시
git push origin master
```

### 2. GitHub Desktop 사용

1. GitHub Desktop 열기
2. 변경사항 확인 (Changes 탭)
3. 커밋 메시지 작성
4. "Commit to master" 클릭
5. "Push origin" 클릭

### 3. VS Code 사용

1. Source Control 탭 열기 (Ctrl+Shift+G)
2. 변경된 파일 확인
3. "+" 버튼으로 스테이징
4. 커밋 메시지 입력
5. "Commit" 클릭
6. "Sync Changes" 또는 "Push" 클릭

## GitHub Actions 설정

### 환경 변수 설정

파이프라인이 정상 작동하려면 다음 환경 변수를 설정해야 합니다:

1. GitHub 저장소로 이동: https://github.com/kwpark0047-iceu/c251229
2. **Settings** → **Secrets and variables** → **Actions** 클릭
3. **New repository secret** 클릭
4. 다음 시크릿 추가:

   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
     **Value**: Supabase 프로젝트 URL

   - **Name**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     **Value**: Supabase Anon Key

### 파이프라인 테스트

1. 파일 푸시 후 **Actions** 탭으로 이동
2. 워크플로우 실행 상태 확인
3. 각 작업의 로그 확인 가능

## 파이프라인 동작 확인

### 자동 실행
- `master` 또는 `develop` 브랜치에 push 시 자동 실행
- Pull Request 생성 시 자동 실행

### 수동 실행
1. GitHub 저장소 → **Actions** 탭
2. 왼쪽 사이드바에서 **"Test Pipeline"** 선택
3. **"Run workflow"** 버튼 클릭
4. 브랜치 선택 후 **"Run workflow"** 클릭

## 예상 결과

파이프라인이 성공적으로 실행되면:

```
✅ Lint Check - 통과
✅ TypeScript Type Check - 통과  
✅ Unit Tests - 통과
✅ Build Check - 통과
```

## 문제 해결

### Actions 탭에 워크플로우가 보이지 않는 경우
- `.github/workflows/` 폴더가 올바르게 푸시되었는지 확인
- 파일 확장자가 `.yml`인지 확인

### 환경 변수 오류
- Secrets에 올바른 값이 설정되었는지 확인
- 변수 이름이 정확한지 확인 (대소문자 구분)

### 빌드 실패
- 로컬에서 `npm run build`가 성공하는지 확인
- GitHub Actions 로그에서 구체적인 오류 확인

## 추가 리소스

- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [프로젝트 파이프라인 가이드](docs/PIPELINE.md)
- [저장소](https://github.com/kwpark0047-iceu/c251229)
