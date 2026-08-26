# Change Log

## [1.0.0] - 2026-08-22
### Fixed
- Korean font encoding in proposal PDF generation
  - Fixed Base64 encoding bug: `btoa(new Uint8Array().reduce(...))` → `String.fromCharCode(...bytes)`
  - Added 3-step fallback system: Google Fonts NanumGothic → DotumChe → helvetica KSC
  - Resolution confirmed by user: '해결 되엇는데 테스트하셔요.'

## [Previous] - ...
- Other previous changes...