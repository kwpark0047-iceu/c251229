# Prisma Migrations (전환 가이드)

## 배경

기존에는 `prisma db push`로 스키마를 적용했습니다. `--accept-data-loss` 플래그가
포함된 `db push`는 운영 DB에 데이터 손실 리스크가 있어, **`prisma migrate deploy`** 기반
워크플로우로 전환합니다. `vercel-build`는 이미 `prisma migrate deploy`를 실행합니다.

## Baseline (0001_init)

`0001_init/migration.sql`은 현재 `schema.prisma`(31개 모델)를 `migrate diff --from-empty`로
생성한 **첫 스키마 스냅샷**입니다. 운용 중인 DB와의 관계:

- **신규 DB (Vercel/새 환경)**: `migrate deploy`가 0001_init을 그대로 적용합니다.
- **기존 DB (db push로 이미 생성된 운영 DB)**: 테이블이 이미 존재하므로 0001_init을
  그대로 적용하면 "이미 존재하는 테이블" 오류로 실패합니다.
  **운영 DB에 한 번만** 아래를 실행해 baseline을 "적용됨"으로 표시해야 합니다:

  ```bash
  npx prisma migrate resolve --applied 0001_init
  ```

  이후부터는 `prisma migrate dev`(로컬) / `prisma migrate deploy`(프로덕션)로
  증분 마이그레이션만 생성·적용합니다.

## 규칙

| 항목 | 값 |
|---|---|
| 신규 마이그레이션 생성 | `npm run db:migrate` (= `prisma migrate dev`) |
| 프로덕션 적용 | `npx prisma migrate deploy` |
| 롤백 | `prisma migrate resolve --rolled-back` (강제 표시, SQL 롤백 아님) |
| SQLite (dev) | `db:dev:*` 스크립트가 `schema.sqlite.prisma`로 별도 관리 (drift는 `db:check:drift`) |

## 주의

- `prisma db push --accept-data-loss`는 더 이상 프로덕션에서 사용하지 않습니다.
- 모델 변경 시 `prisma/schema.prisma`(PG)와 `prisma/schema.sqlite.prisma`(SQLite)
  **둘 다** 갱신해야 합니다. 로컬에서 `npm run db:check:drift`로 일치 여부를 확인하세요.