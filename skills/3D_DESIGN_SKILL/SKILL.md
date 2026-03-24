---
name: "3D 입체 디자인 시스템 가이드"
description: "Glassmorphism, Neumorphism, Antigravity 3D 테마 적용 및 유지보수를 위한 전문 기술 스킬"
---

# 3D 입체 디자인 스킬 (3D Design Skill)

이 스킬은 현대적인 3D 입체 디자인 트렌드를 프로젝트에 적용하고 유지보수하는 방법을 정의합니다.

## 1. 개요
프로젝트의 시각적 프리미엄을 높이기 위해 세 가지 주요 3D 디자인 패턴을 제공합니다.
- **Glassmorphism**: 유리 질감, 투명도, 배경 블러 처리.
- **Neumorphism**: 물리적 버튼 효과, 하이라이트 및 섀도우 조화.
- **Antigravity 3D**: 부유 애니메이션, 다층 섀도우(Zero-G 효과).

## 2. 핵심 파일 구조
- **[design-tokens.ts](file:///d:/c251229/src/app/lead-manager/utils/design-tokens.ts)**: 테마별 CSS 변수 및 클래스 맵 정의.
- **[design.css](file:///d:/c251229/src/app/lead-manager/design.css)**: 실제 3D 시각 효과를 구현하는 전역 스타일시트.

## 3. 적용 방법 (Best Practices)
새로운 컴포넌트에 3D 효과를 적용할 때는 다음 패턴을 따릅니다.

### 카드 요소 적용 예시
```tsx
import { getCardClass } from '../utils/design-tokens';

export function MyComponent() {
  return (
    <div className={`rounded-xl p-4 ${getCardClass()}`}>
      {/* 컨텐츠 */}
    </div>
  );
}
```

## 4. 유지보수 및 확장
- 새로운 테마를 추가할 경우 `DESIGN_THEMES` 객체에 새로운 키를 추가하고 `design.css`에 해당 클래스 선택자를 정의합니다.
- 중첩된 3D 효과(Shadow inside Glass 등)는 가독성과 성능을 고려하여 `design.css`의 유틸리티 클래스를 조합하여 사용합니다.
