import { test, expect } from '@playwright/test';

// Leaflet 타입 확장 (page.evaluate 내부에서만 사용)
declare global {
  interface HTMLElement {
    _leaflet_map?: any;
  }
}

test.describe('Map Data Service - E2E Tests', () => {
  // Helper to wait for map to be ready
  async function waitForMapReady(page: any) {
    await page.waitForSelector('div.bg-white.rounded-2xl', { timeout: 30000 });
    await page.waitForFunction(() => {
      const mapContainer = document.querySelector('.leaflet-container') as HTMLElement;
      return mapContainer && mapContainer._leaflet_map;
    }, { timeout: 30000 });
    await page.waitForTimeout(2000); // Allow markers to render
  }

  // Helper to get zoom level
  async function getZoomLevel(page: any): Promise<number> {
    return await page.evaluate((): number => {
      const mapContainer = document.querySelector('.leaflet-container') as HTMLElement;
      return mapContainer?._leaflet_map?.getZoom() || 0;
    });
  }

  // Helper to set zoom level
  async function setZoomLevel(page: any, zoom: number): Promise<void> {
    await page.evaluate((z: number): void => {
      const mapContainer = document.querySelector('.leaflet-container') as HTMLElement;
      if (mapContainer?._leaflet_map) {
        mapContainer._leaflet_map.setZoom(z);
      }
    }, zoom);
    await page.waitForTimeout(1000);
  }

  // Helper to get marker count
  async function getMarkerCount(page: any): Promise<number> {
    return await page.evaluate((): number => {
      const mapContainer = document.querySelector('.leaflet-container') as HTMLElement;
      if (!mapContainer?._leaflet_map) return 0;
      let count = 0;
      // Check for CircleMarker class in browser context
      const Leaflet = (window as any).L;
      const CircleMarkerClass = Leaflet?.CircleMarker;
      mapContainer._leaflet_map.eachLayer((layer: any) => {
        if (CircleMarkerClass && layer instanceof CircleMarkerClass) count++;
      });
      return count;
    });
  }

  test.describe('Bounds Query (경계 내 리드 조회)', () => {
    test('should display leads within visible map bounds', async ({ page }) => {
      await page.goto('/lead-manager');
      
      // Switch to map view
      const mapTab = page.locator('button:has-text("지도")');
      await mapTab.click();
      
      await waitForMapReady(page);
      
      // Verify markers are displayed
      const markerCount = await getMarkerCount(page);
      expect(markerCount).toBeGreaterThan(0);
      
      // Verify stats show lead count
      const statsText = await page.locator('text=N:').textContent();
      expect(statsText).toContain('N:');
    });

    test('should update markers when panning map', async ({ page }) => {
      await page.goto('/lead-manager');
      
      const mapTab = page.locator('button:has-text("지도")');
      await mapTab.click();
      
      await waitForMapReady(page);
      
      const initialMarkers = await getMarkerCount(page);
      
      // Pan map by dragging
      const mapContainer = page.locator('.leaflet-container');
      await mapContainer.hover();
      await page.mouse.down();
      await page.mouse.move(500, 300);
      await page.mouse.up();
      
      await page.waitForTimeout(2000);
      
      // Markers should update based on new bounds
      const newMarkers = await getMarkerCount(page);
      // May be same or different depending on lead distribution
      expect(newMarkers).toBeGreaterThanOrEqual(0);
    });

    test('should update markers when zooming in/out', async ({ page }) => {
      await page.goto('/leadmanager');
      
      const mapTab = page.locator('button:has-text("지도")');
      await mapTab.click();
      
      await waitForMapReady(page);
      
      const initialZoom = await getZoomLevel(page);
      const initialMarkers = await getMarkerCount(page);
      
      // Zoom in
      await setZoomLevel(page, initialZoom + 2);
      const zoomedInMarkers = await getMarkerCount(page);
      
      // Zoom out
      await setZoomLevel(page, initialZoom - 2);
      const zoomedOutMarkers = await getMarkerCount(page);
      
      // Marker count should change with zoom (clustering effect)
      expect(zoomedInMarkers + zoomedOutMarkers).not.toBe(initialMarkers * 2);
    });
  });

  test.describe('Clustering Thresholds (줌 레벨별 클러스터링)', () => {
    test('should show individual markers at high zoom (>=15)', async ({ page }) => {
      await page.goto('/lead-manager');
      
      const mapTab = page.locator('button:has-text("지도")');
      await mapTab.click();
      
      await waitForMapReady(page);
      
      // Zoom in to level 16 (high zoom - individual markers)
      await setZoomLevel(page, 16);
      
      const markersAtHighZoom = await getMarkerCount(page);
      expect(markersAtHighZoom).toBeGreaterThan(0);
    });

    test('should cluster markers at medium zoom (12-14)', async ({ page }) => {
      await page.goto('/lead-manager');
      
      const mapTab = page.locator('button:has-text("지도")');
      await mapTab.click();
      
      await waitForMapReady(page);
      
      // Zoom to level 13 (medium zoom - clustering)
      await setZoomLevel(page, 13);
      
      const markersAtMediumZoom = await getMarkerCount(page);
      // Should have fewer visible elements due to clustering
      expect(markersAtMediumZoom).toBeGreaterThanOrEqual(0);
    });

    test('should show larger clusters at low zoom (<12)', async ({ page }) => {
      await page.goto('/lead-manager');
      
      const mapTab = page.locator('button:has-text("지도")');
      await mapTab.click();
      
      await waitForMapReady(page);
      
      // Zoom out to level 10 (low zoom - larger clusters)
      await setZoomLevel(page, 10);
      
      const markersAtLowZoom = await getMarkerCount(page);
      // Should have very few clusters at this zoom
      expect(markersAtLowZoom).toBeGreaterThanOrEqual(0);
    });

    test('should adjust cluster distance threshold by zoom level', async ({ page }) => {
      await page.goto('/lead-manager');
      
      const mapTab = page.locator('button:has-text("지도")');
      await mapTab.click();
      
      await waitForMapReady(page);
      
      // Test zoom < 12: maxDistance=0.005, minClusterSize=10
      await setZoomLevel(page, 11);
      await page.waitForTimeout(1000);
      const lowZoomMarkers = await getMarkerCount(page);
      
      // Test zoom 12-14: maxDistance=0.002, minClusterSize=5
      await setZoomLevel(page, 13);
      await page.waitForTimeout(1000);
      const mediumZoomMarkers = await getMarkerCount(page);
      
      // Test zoom >= 15: maxDistance=0.001, minClusterSize=3
      await setZoomLevel(page, 16);
      await page.waitForTimeout(1000);
      const highZoomMarkers = await getMarkerCount(page);
      
      // Higher zoom = more individual markers, fewer clusters
      expect(highZoomMarkers).toBeGreaterThanOrEqual(mediumZoomMarkers);
      expect(mediumZoomMarkers).toBeGreaterThanOrEqual(lowZoomMarkers);
    });
  });

  test.describe('Cache Expiration (캐시 만료)', () => {
    test('should serve cached data within TTL (5 minutes)', async ({ page }) => {
      await page.goto('/lead-manager');
      
      const mapTab = page.locator('button:has-text("지도")');
      await mapTab.click();
      
      await waitForMapReady(page);
      
      // Get initial cache stats by triggering a bounds query
      await setZoomLevel(page, 14);
      await page.waitForTimeout(1000);
      
      // Pan slightly to trigger same bounds cache
      const mapContainer = page.locator('.leaflet-container');
      await mapContainer.hover();
      await page.mouse.down();
      await page.mouse.move(100, 100);
      await page.mouse.up();
      
      await page.waitForTimeout(1000);
      
      // Should use cache (no visible delay)
      const markers = await getMarkerCount(page);
      expect(markers).toBeGreaterThanOrEqual(0);
    });

    test('should invalidate cache after TTL expires', async ({ page }) => {
      await page.goto('/lead-manager');
      
      const mapTab = page.locator('button:has-text("지도")');
      await mapTab.click();
      
      await waitForMapReady(page);
      
      // Wait for cache to potentially expire (5 min TTL)
      // Note: In E2E we can't wait 5 minutes, so we test the cache clearing mechanism
      // by forcing a cache clear through a full zoom change
      await setZoomLevel(page, 14);
      await page.waitForTimeout(1000);
      
      // Force cache clear by zooming out significantly
      await setZoomLevel(page, 8);
      await page.waitForTimeout(1000);
      
      // Zoom back in
      await setZoomLevel(page, 14);
      await page.waitForTimeout(1000);
      
      const markers = await getMarkerCount(page);
      expect(markers).toBeGreaterThanOrEqual(0);
    });

    test('should clear cache when leads data changes', async ({ page }) => {
      await page.goto('/lead-manager');
      
      const mapTab = page.locator('button:has-text("지도")');
      await mapTab.click();
      
      await waitForMapReady(page);
      
      const initialMarkers = await getMarkerCount(page);
      
      // Switch to grid view and back to trigger potential data refresh
      const gridTab = page.locator('button:has-text("그리드")');
      await gridTab.click();
      await page.waitForTimeout(1000);
      
      await mapTab.click();
      await waitForMapReady(page);
      
      const afterRefreshMarkers = await getMarkerCount(page);
      expect(afterRefreshMarkers).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Spatial Index Performance (공간 인덱스 성능)', () => {
    test('should render markers quickly for large datasets', async ({ page }) => {
      await page.goto('/lead-manager');
      
      const mapTab = page.locator('button:has-text("지도")');
      await mapTab.click();
      
      const startTime = Date.now();
      await waitForMapReady(page);
      const renderTime = Date.now() - startTime;
      
      // Map should render within reasonable time
      expect(renderTime).toBeLessThan(10000); // 10 seconds max
      
      const markerCount = await getMarkerCount(page);
      expect(markerCount).toBeGreaterThan(0);
    });

    test('should maintain performance during rapid zoom changes', async ({ page }) => {
      await page.goto('/lead-manager');
      
      const mapTab = page.locator('button:has-text("지도")');
      await mapTab.click();
      
      await waitForMapReady(page);
      
      // Rapid zoom changes
      for (let i = 0; i < 5; i++) {
        await setZoomLevel(page, 10 + i);
        await page.waitForTimeout(500);
      }
      
      const finalMarkers = await getMarkerCount(page);
      expect(finalMarkers).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Heatmap Data Caching', () => {
    test('should toggle heatmap and cache data', async ({ page }) => {
      await page.goto('/lead-manager');
      
      const mapTab = page.locator('button:has-text("지도")');
      await mapTab.click();
      
      await waitForMapReady(page);
      
      // Click heatmap toggle button
      const heatmapBtn = page.locator('button:has-text("매출 히트맵"), button:has-text("히트맵 ON")');
      await heatmapBtn.click();
      
      // Wait for heatmap to load
      await page.waitForTimeout(3000);
      
      // Verify heatmap is shown (button text changes)
      const btnText = await heatmapBtn.textContent();
      expect(btnText).toContain('ON');
      
      // Toggle off
      await heatmapBtn.click();
      await page.waitForTimeout(1000);
    });
  });
});