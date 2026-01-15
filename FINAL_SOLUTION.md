# 최종 해결책 - 관리자 권한으로 실행

## 문제 해결 방법

### 방법 1: 관리자 권한으로 PowerShell 실행
1. VS Code를 마우스 오른쪽 버튼으로 클릭
2. "PowerShell(관리자)" 선택
3. 아래 명령어 입력 후 실행

### 방법 2: 배치 파일 관리자 권한으로 실행
1. start-dev-cmd.bat 파일 마우스 오른쪽 버튼으로 클릭
2. "관리자 권한으로 실행" 선택

### 방법 3: CMD 직접 실행
1. Win+R 키 누르기
2. cmd 입력 후 엔터
3. 아래 명령어 입력 후 실행

## 실행 명령어

### PowerShell (관리자 권한)
```powershell
# 관리자 권한으로 PowerShell 실행
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

# 프로젝트 디렉토리로 이동
cd "f:\c251229"

# PATH 환경변수 설정
$env:PATH = "C:\Program Files\nodejs;C:\Windows\system32;C:\Windows\System32\Wbem;C:\Windows\System32\WindowsPowerShell\v1.0"

# 개발 서버 시작
npm run dev
```

### CMD
```cmd
@echo off
cd /d "f:\c251229"
set PATH=C:\Program Files\nodejs;C:\Windows\system32
npm run dev
pause
```

## 문제 해결 단계

1. ✅ 관리자 권한 획득
2. ✅ PATH 환경변수 설정
3. ✅ node_modules 정리
4. ✅ 의존성 재설치
5. ✅ 개발 서버 시작

## 예상 결과

- 개발 서버가 http://localhost:3000 에서 실행
- 검색 데이터 중복 문제 해결 확인
- 최신 코드로 정상 작동

## 권장 사항

**가장 추천**: 방법 1 (PowerShell 관리자 권한)
**안정적**: 방법 2 (배치 파일 관리자 권한)
**보조**: 방법 3 (CMD 직접 실행)

## 성공 확인

개발 서버 시작 후 브라우저에서 http://localhost:3000 으로 접속하여
검색 기능이 정상적으로 작동하는지 확인하세요.
