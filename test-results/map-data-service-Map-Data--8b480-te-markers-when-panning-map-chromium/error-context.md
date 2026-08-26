# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: map-data-service.spec.ts >> Map Data Service - E2E Tests >> Bounds Query (경계 내 리드 조회) >> should update markers when panning map
- Location: tests/e2e/map-data-service.spec.ts:75:9

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("지도")')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e21]:
    - generic [ref=e22]:
      - heading "지하철 광고 영업" [level=1] [ref=e30]
      - paragraph [ref=e31]: SEOUL METRO ADVERTISING PLATFORM
    - generic [ref=e32]:
      - generic [ref=e33]:
        - button "로그인" [ref=e34]
        - button "회원가입" [ref=e35]
        - button "조직 가입" [ref=e36]
      - generic [ref=e37]:
        - generic [ref=e38]:
          - generic [ref=e39]: 이메일
          - textbox "이메일" [ref=e40]:
            - /placeholder: example@email.com
        - generic [ref=e41]:
          - generic [ref=e42]: 비밀번호
          - textbox "비밀번호" [ref=e43]:
            - /placeholder: ••••••••
        - button "로그인" [ref=e44]
    - generic [ref=e45]:
      - generic [ref=e46]:
        - generic [ref=e47]: "1"
        - generic [ref=e48]: "2"
        - generic [ref=e49]: "3"
        - generic [ref=e50]: "4"
        - generic [ref=e51]: "5"
      - paragraph [ref=e52]: Seoul Metro Lead Management System
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e58] [cursor=pointer]
  - alert [ref=e62]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | // Leaflet 타입 확장 (page.evaluate 내부에서만 사용)
  4   | declare global {
  5   |   interface HTMLElement {
  6   |     _leaflet_map?: any;
  7   |   }
  8   | }
  9   | 
  10  | test.describe('Map Data Service - E2E Tests', () => {
  11  |   // Helper to wait for map to be ready
  12  |   async function waitForMapReady(page: any) {
  13  |     await page.waitForSelector('div.bg-white.rounded-2xl', { timeout: 30000 });
  14  |     await page.waitForFunction(() => {
  15  |       const mapContainer = document.querySelector('.leaflet-container') as HTMLElement;
  16  |       return mapContainer && mapContainer._leaflet_map;
  17  |     }, { timeout: 30000 });
  18  |     await page.waitForTimeout(2000); // Allow markers to render
  19  |   }
  20  | 
  21  |   // Helper to get zoom level
  22  |   async function getZoomLevel(page: any): Promise<number> {
  23  |     return await page.evaluate((): number => {
  24  |       const mapContainer = document.querySelector('.leaflet-container') as HTMLElement;
  25  |       return mapContainer?._leaflet_map?.getZoom() || 0;
  26  |     });
  27  |   }
  28  | 
  29  |   // Helper to set zoom level
  30  |   async function setZoomLevel(page: any, zoom: number): Promise<void> {
  31  |     await page.evaluate((z: number): void => {
  32  |       const mapContainer = document.querySelector('.leaflet-container') as HTMLElement;
  33  |       if (mapContainer?._leaflet_map) {
  34  |         mapContainer._leaflet_map.setZoom(z);
  35  |       }
  36  |     }, zoom);
  37  |     await page.waitForTimeout(1000);
  38  |   }
  39  | 
  40  |   // Helper to get marker count
  41  |   async function getMarkerCount(page: any): Promise<number> {
  42  |     return await page.evaluate((): number => {
  43  |       const mapContainer = document.querySelector('.leaflet-container') as HTMLElement;
  44  |       if (!mapContainer?._leaflet_map) return 0;
  45  |       let count = 0;
  46  |       // Check for CircleMarker class in browser context
  47  |       const Leaflet = (window as any).L;
  48  |       const CircleMarkerClass = Leaflet?.CircleMarker;
  49  |       mapContainer._leaflet_map.eachLayer((layer: any) => {
  50  |         if (CircleMarkerClass && layer instanceof CircleMarkerClass) count++;
  51  |       });
  52  |       return count;
  53  |     });
  54  |   }
  55  | 
  56  |   test.describe('Bounds Query (경계 내 리드 조회)', () => {
  57  |     test('should display leads within visible map bounds', async ({ page }) => {
  58  |       await page.goto('/lead-manager');
  59  |       
  60  |       // Switch to map view
  61  |       const mapTab = page.locator('button:has-text("지도")');
  62  |       await mapTab.click();
  63  |       
  64  |       await waitForMapReady(page);
  65  |       
  66  |       // Verify markers are displayed
  67  |       const markerCount = await getMarkerCount(page);
  68  |       expect(markerCount).toBeGreaterThan(0);
  69  |       
  70  |       // Verify stats show lead count
  71  |       const statsText = await page.locator('text=N:').textContent();
  72  |       expect(statsText).toContain('N:');
  73  |     });
  74  | 
  75  |     test('should update markers when panning map', async ({ page }) => {
  76  |       await page.goto('/lead-manager');
  77  |       
  78  |       const mapTab = page.locator('button:has-text("지도")');
> 79  |       await mapTab.click();
      |                    ^ Error: locator.click: Test timeout of 30000ms exceeded.
  80  |       
  81  |       await waitForMapReady(page);
  82  |       
  83  |       const initialMarkers = await getMarkerCount(page);
  84  |       
  85  |       // Pan map by dragging
  86  |       const mapContainer = page.locator('.leaflet-container');
  87  |       await mapContainer.hover();
  88  |       await page.mouse.down();
  89  |       await page.mouse.move(500, 300);
  90  |       await page.mouse.up();
  91  |       
  92  |       await page.waitForTimeout(2000);
  93  |       
  94  |       // Markers should update based on new bounds
  95  |       const newMarkers = await getMarkerCount(page);
  96  |       // May be same or different depending on lead distribution
  97  |       expect(newMarkers).toBeGreaterThanOrEqual(0);
  98  |     });
  99  | 
  100 |     test('should update markers when zooming in/out', async ({ page }) => {
  101 |       await page.goto('/leadmanager');
  102 |       
  103 |       const mapTab = page.locator('button:has-text("지도")');
  104 |       await mapTab.click();
  105 |       
  106 |       await waitForMapReady(page);
  107 |       
  108 |       const initialZoom = await getZoomLevel(page);
  109 |       const initialMarkers = await getMarkerCount(page);
  110 |       
  111 |       // Zoom in
  112 |       await setZoomLevel(page, initialZoom + 2);
  113 |       const zoomedInMarkers = await getMarkerCount(page);
  114 |       
  115 |       // Zoom out
  116 |       await setZoomLevel(page, initialZoom - 2);
  117 |       const zoomedOutMarkers = await getMarkerCount(page);
  118 |       
  119 |       // Marker count should change with zoom (clustering effect)
  120 |       expect(zoomedInMarkers + zoomedOutMarkers).not.toBe(initialMarkers * 2);
  121 |     });
  122 |   });
  123 | 
  124 |   test.describe('Clustering Thresholds (줌 레벨별 클러스터링)', () => {
  125 |     test('should show individual markers at high zoom (>=15)', async ({ page }) => {
  126 |       await page.goto('/lead-manager');
  127 |       
  128 |       const mapTab = page.locator('button:has-text("지도")');
  129 |       await mapTab.click();
  130 |       
  131 |       await waitForMapReady(page);
  132 |       
  133 |       // Zoom in to level 16 (high zoom - individual markers)
  134 |       await setZoomLevel(page, 16);
  135 |       
  136 |       const markersAtHighZoom = await getMarkerCount(page);
  137 |       expect(markersAtHighZoom).toBeGreaterThan(0);
  138 |     });
  139 | 
  140 |     test('should cluster markers at medium zoom (12-14)', async ({ page }) => {
  141 |       await page.goto('/lead-manager');
  142 |       
  143 |       const mapTab = page.locator('button:has-text("지도")');
  144 |       await mapTab.click();
  145 |       
  146 |       await waitForMapReady(page);
  147 |       
  148 |       // Zoom to level 13 (medium zoom - clustering)
  149 |       await setZoomLevel(page, 13);
  150 |       
  151 |       const markersAtMediumZoom = await getMarkerCount(page);
  152 |       // Should have fewer visible elements due to clustering
  153 |       expect(markersAtMediumZoom).toBeGreaterThanOrEqual(0);
  154 |     });
  155 | 
  156 |     test('should show larger clusters at low zoom (<12)', async ({ page }) => {
  157 |       await page.goto('/lead-manager');
  158 |       
  159 |       const mapTab = page.locator('button:has-text("지도")');
  160 |       await mapTab.click();
  161 |       
  162 |       await waitForMapReady(page);
  163 |       
  164 |       // Zoom out to level 10 (low zoom - larger clusters)
  165 |       await setZoomLevel(page, 10);
  166 |       
  167 |       const markersAtLowZoom = await getMarkerCount(page);
  168 |       // Should have very few clusters at this zoom
  169 |       expect(markersAtLowZoom).toBeGreaterThanOrEqual(0);
  170 |     });
  171 | 
  172 |     test('should adjust cluster distance threshold by zoom level', async ({ page }) => {
  173 |       await page.goto('/lead-manager');
  174 |       
  175 |       const mapTab = page.locator('button:has-text("지도")');
  176 |       await mapTab.click();
  177 |       
  178 |       await waitForMapReady(page);
  179 |       
```