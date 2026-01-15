This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Testing & CI/CD

### 파이프라인 테스트

전체 CI/CD 파이프라인을 로컬에서 테스트:

```bash
# 전체 파이프라인 실행
npm run ci

# 또는 개별 스크립트 사용
npm run lint          # Lint 체크
npm run type-check    # TypeScript 타입 체크
npm run test          # 단위 테스트
npm run build         # 빌드 테스트
```

### 로컬 테스트 스크립트

**Windows (PowerShell):**
```powershell
.\scripts\test-pipeline.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x scripts/test-pipeline.sh
./scripts/test-pipeline.sh
```

자세한 내용은 [파이프라인 가이드](docs/PIPELINE.md)를 참조하세요.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
