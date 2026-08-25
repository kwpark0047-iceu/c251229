import { describe, expect, it, beforeEach, vi } from 'vitest';
import { MapDataService, SpatialHashGrid, MarkerClusterer, MapDataCache } from '@/app/lead-manager/map-data-service';
import type { Lead } from '@/app/lead-manager/types';

const createTestLead = (overrides: Partial<Lead> = {}): Lead => ({
  id: `lead-${Math.random()}`,
  bizName: 'Test Biz',
  status: 'NEW',
  latitude: 37.5012,
  longitude: 127.0396,
  lat: 37.5012,
  lng: 127.0396,
  ...overrides,
});

describe('SpatialHashGrid', () => {
  let grid: SpatialHashGrid;

  beforeEach(() => {
    grid = new SpatialHashGrid(0.001);
  });

  it('should insert and query leads within bounds', () => {
    const lead1 = createTestLead({ 
      id: 'lead-1', 
      latitude: 37.5012, 
      longitude: 127.0396,
      lat: 37.5012,
      lng: 127.0396
    });
    const lead2 = createTestLead({ 
      id: 'lead-2', 
      latitude: 37.5020, 
      longitude: 127.0400,
      lat: 37.5020,
      lng: 127.0400
    });
    const lead3 = createTestLead({ 
      id: 'lead-3', 
      latitude: 37.6000, 
      longitude: 127.1000,
      lat: 37.6000,
      lng: 127.1000
    }); // Far away

    grid.insert(lead1);
    grid.insert(lead2);
    grid.insert(lead3);

    const results = grid.query({
      minLat: 37.5000,
      maxLat: 37.5100,
      minLng: 127.0300,
      maxLng: 127.0500,
    });

    expect(results).toHaveLength(2);
    expect(results.map(r => r.id)).toContain('lead-1');
    expect(results.map(r => r.id)).toContain('lead-2');
  });

  it('should return empty array for bounds with no leads', () => {
    const lead = createTestLead({ 
      latitude: 37.5012, 
      longitude: 127.0396,
      lat: 37.5012,
      lng: 127.0396
    });
    grid.insert(lead);

    const results = grid.query({
      minLat: 38.0000,
      maxLat: 38.1000,
      minLng: 128.0000,
      maxLng: 128.1000,
    });

    expect(results).toHaveLength(0);
  });

  it('should ignore leads without coordinates', () => {
    const leadNoCoords = createTestLead({ 
      latitude: undefined, 
      longitude: undefined,
      lat: undefined,
      lng: undefined
    });
    const leadWithCoords = createTestLead({ 
      latitude: 37.5012, 
      longitude: 127.0396,
      lat: 37.5012,
      lng: 127.0396
    });

    grid.insert(leadNoCoords);
    grid.insert(leadWithCoords);

    const results = grid.query({
      minLat: 37.5000,
      maxLat: 37.5100,
      minLng: 127.0300,
      maxLng: 127.0500,
    });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(leadWithCoords.id);
  });

  it('should clear grid', () => {
    grid.insert(createTestLead());
    grid.clear();

    const results = grid.query({
      minLat: 37.0000,
      maxLat: 38.0000,
      minLng: 126.0000,
      maxLng: 128.0000,
    });

    expect(results).toHaveLength(0);
  });
});

describe('MarkerClusterer', () => {
  let clusterer: MarkerClusterer;

  beforeEach(() => {
    // Use meters for maxDistance (Haversine returns meters)
    clusterer = new MarkerClusterer(200, 3); // 200m, min 3 for cluster
  });

  it('should cluster nearby leads', () => {
    // Leads within ~10-20m of each other (well within 200m)
    const leads = [
      createTestLead({ id: '1', latitude: 37.5012, longitude: 127.0396, lat: 37.5012, lng: 127.0396 }),
      createTestLead({ id: '2', latitude: 37.50121, longitude: 127.03961, lat: 37.50121, lng: 127.03961 }),
      createTestLead({ id: '3', latitude: 37.50122, longitude: 127.03962, lat: 37.50122, lng: 127.03962 }),
      // Far away lead (~11km)
      createTestLead({ id: '4', latitude: 37.6000, longitude: 127.1000, lat: 37.6000, lng: 127.1000 }),
    ];

    const clusters = clusterer.cluster(leads);

    expect(clusters.length).toBe(2);
    const cluster = clusters.find(c => c.type === 'cluster');
    expect(cluster).toBeDefined();
    expect(cluster?.leads.length).toBe(3);
    
    const marker = clusters.find(c => c.type === 'marker');
    expect(marker).toBeDefined();
    expect(marker?.leads.length).toBe(1);
  });

  it('should not cluster leads beyond maxDistance', () => {
    const leads = [
      createTestLead({ id: '1', latitude: 37.5012, longitude: 127.0396, lat: 37.5012, lng: 127.0396 }),
      createTestLead({ id: '2', latitude: 37.5500, longitude: 127.1000, lat: 37.5500, lng: 127.1000 }), // ~5km away
    ];

    const clusters = clusterer.cluster(leads);

    expect(clusters.length).toBe(2);
    expect(clusters.every(c => c.type === 'marker')).toBe(true);
  });

  it('should respect minClusterSize', () => {
    const clustererSmall = new MarkerClusterer(200, 5); // min 5, 200m
    const leads = [
      createTestLead({ id: '1', latitude: 37.5012, longitude: 127.0396, lat: 37.5012, lng: 127.0396 }),
      createTestLead({ id: '2', latitude: 37.5013, longitude: 127.0397, lat: 37.5013, lng: 127.0397 }),
      createTestLead({ id: '3', latitude: 37.5014, longitude: 127.0398, lat: 37.5014, lng: 127.0398 }),
    ];

    const clusters = clustererSmall.cluster(leads);

    expect(clusters.length).toBe(3);
    expect(clusters.every(c => c.type === 'marker')).toBe(true);
  });

  it('should calculate cluster center correctly', () => {
    const leads = [
      createTestLead({ id: '1', latitude: 37.5000, longitude: 127.0000, lat: 37.5000, lng: 127.0000 }),
      createTestLead({ id: '2', latitude: 37.5001, longitude: 127.0001, lat: 37.5001, lng: 127.0001 }),
      createTestLead({ id: '3', latitude: 37.5002, longitude: 127.0002, lat: 37.5002, lng: 127.0002 }),
    ];

    const clusters = clusterer.cluster(leads);
    const cluster = clusters.find(c => c.type === 'cluster');

    expect(cluster).toBeDefined();
    expect(cluster?.position[0]).toBeCloseTo(37.5001, 4);
    expect(cluster?.position[1]).toBeCloseTo(127.0001, 4);
  });

  it('should handle empty leads array', () => {
    const clusters = clusterer.cluster([]);
    expect(clusters).toHaveLength(0);
  });
});

describe('MapDataCache', () => {
  let cache: MapDataCache;

  beforeEach(() => {
    cache = new MapDataCache();
    // Access private properties for testing
    (cache as any).maxCacheSize = 3;
    (cache as any).cacheTimeout = 1000; // 1 second for testing
  });

  it('should store and retrieve data', () => {
    cache.set('key1', { data: 'value1' });
    const result = cache.get('key1');
    
    expect(result).toEqual({ data: 'value1' });
  });

  it('should return null for missing keys', () => {
    const result = cache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('should expire data after TTL', async () => {
    cache.set('key1', { data: 'value1' });
    
    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const result = cache.get('key1');
    expect(result).toBeNull();
  });

  it('should evict least used item when cache is full (LRU)', () => {
    cache.set('key1', { data: 'value1' });
    cache.set('key2', { data: 'value2' });
    cache.set('key3', { data: 'value3' });
    
    // Access key1 and key2 multiple times
    cache.get('key1');
    cache.get('key1');
    cache.get('key2');
    
    // Add new item - should evict key3 (least accessed)
    cache.set('key4', { data: 'value4' });
    
    expect(cache.get('key1')).toEqual({ data: 'value1' });
    expect(cache.get('key2')).toEqual({ data: 'value2' });
    expect(cache.get('key3')).toBeNull(); // Evicted
    expect(cache.get('key4')).toEqual({ data: 'value4' });
  });

  it('should track hit/miss statistics', () => {
    cache.set('key1', { data: 'value1' });
    
    cache.get('key1'); // hit
    cache.get('key1'); // hit
    cache.get('key2'); // miss
    
    const stats = cache.getStats();
    expect(stats.hitCount).toBe(2);
    expect(stats.missCount).toBe(1);
    expect(stats.hitRate).toBeCloseTo(2/3, 2);
  });

  it('should clear all data', () => {
    cache.set('key1', { data: 'value1' });
    cache.set('key2', { data: 'value2' });
    
    cache.clear();
    
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
    expect(cache.getStats().size).toBe(0);
  });
});

describe('MapDataService Integration', () => {
  let service: MapDataService;

  beforeEach(() => {
    service = new MapDataService();
  });

  it('should set leads and build spatial index', () => {
    const leads = [
      createTestLead({ id: '1', latitude: 37.5012, longitude: 127.0396, lat: 37.5012, lng: 127.0396 }),
      createTestLead({ id: '2', latitude: 37.5020, longitude: 127.0400, lat: 37.5020, lng: 127.0400 }),
      createTestLead({ id: '3', latitude: 37.6000, longitude: 127.1000, lat: 37.6000, lng: 127.1000 }),
    ];

    service.setLeads(leads);

    const results = service.getLeadsInBounds({
      minLat: 37.5000,
      maxLat: 37.5100,
      minLng: 127.0300,
      maxLng: 127.0500,
    });

    expect(results).toHaveLength(2);
  });

  it('should cache bounds queries', () => {
    const leads = [createTestLead({ id: '1', latitude: 37.5012, longitude: 127.0396, lat: 37.5012, lng: 127.0396 })];
    service.setLeads(leads);

    // First call - cache miss
    const result1 = service.getLeadsInBounds({
      minLat: 37.5000,
      maxLat: 37.5100,
      minLng: 127.0300,
      maxLng: 127.0500,
    });

    // Second call - cache hit
    const result2 = service.getLeadsInBounds({
      minLat: 37.5000,
      maxLat: 37.5100,
      minLng: 127.0300,
      maxLng: 127.0500,
    });

    expect(result1).toEqual(result2);
    expect(result1).toHaveLength(1);
  });

  it('should cluster markers with zoom-dependent thresholds', () => {
    const leads = Array.from({ length: 10 }, (_, i) => 
      createTestLead({ 
        id: `lead-${i}`, 
        latitude: 37.5012 + i * 0.00001, 
        longitude: 127.0396 + i * 0.00001,
        lat: 37.5012 + i * 0.00001,
        lng: 127.0396 + i * 0.00001
      })
    );
    service.setLeads(leads);

    // Low zoom (11) - larger clusters
    const lowZoomClusters = service.getClusteredMarkers({
      minLat: 37.5000,
      maxLat: 37.5100,
      minLng: 127.0300,
      maxLng: 127.0500,
    }, 11);

    // High zoom (16) - smaller clusters
    const highZoomClusters = service.getClusteredMarkers({
      minLat: 37.5000,
      maxLat: 37.5100,
      minLng: 127.0300,
      maxLng: 127.0500,
    }, 16);

    // Both should return results
    expect(lowZoomClusters.length).toBeGreaterThan(0);
    expect(highZoomClusters.length).toBeGreaterThan(0);
  });

  it('should find nearest leads', () => {
    const leads = [
      createTestLead({ id: '1', latitude: 37.5012, longitude: 127.0396, lat: 37.5012, lng: 127.0396 }),
      createTestLead({ id: '2', latitude: 37.5020, longitude: 127.0400, lat: 37.5020, lng: 127.0400 }),
      createTestLead({ id: '3', latitude: 37.6000, longitude: 127.1000, lat: 37.6000, lng: 127.1000 }),
    ];
    service.setLeads(leads);

    const nearest = service.findNearestLeads(37.5012, 127.0396, 2000, 5);

    expect(nearest.length).toBeGreaterThan(0);
    expect(nearest[0].id).toBe('1'); // Closest to center
  });

  it('should calculate stats', () => {
    const leads = [
      createTestLead({ id: '1', status: 'NEW', category: 'HEALTH', nearestStation: '강남역' }),
      createTestLead({ id: '2', status: 'CONTRACTED', category: 'FOOD', nearestStation: '강남역' }),
      createTestLead({ id: '3', status: 'NEW', category: 'HEALTH', nearestStation: '역삼역' }),
    ];
    service.setLeads(leads);

    const stats = service.getStats();

    expect(stats.total).toBe(3);
    expect(stats.byStatus.NEW).toBe(2);
    expect(stats.byStatus.CONTRACTED).toBe(1);
    expect(stats.byCategory.HEALTH).toBe(2);
    expect(stats.byCategory.FOOD).toBe(1);
    expect(stats.byStation['강남역']).toBe(2);
    expect(stats.byStation['역삼역']).toBe(1);
  });

  it('should generate heatmap data', () => {
    const leads = [
      createTestLead({ id: '1', latitude: 37.5012, longitude: 127.0396, lat: 37.5012, lng: 127.0396 }),
      createTestLead({ id: '2', latitude: 37.50121, longitude: 127.03961, lat: 37.50121, lng: 127.03961 }),
    ];
    service.setLeads(leads);

    const heatmap = service.getHeatmapData({
      minLat: 37.5000,
      maxLat: 37.5100,
      minLng: 127.0300,
      maxLng: 127.0500,
    });

    expect(heatmap.length).toBeGreaterThan(0);
    expect(heatmap[0]).toHaveProperty('lat');
    expect(heatmap[0]).toHaveProperty('lng');
    expect(heatmap[0]).toHaveProperty('intensity');
    expect(heatmap[0].intensity).toBeLessThanOrEqual(1);
  });

  it('should clear cache when leads change', () => {
    const leads1 = [createTestLead({ id: '1', latitude: 37.5012, longitude: 127.0396, lat: 37.5012, lng: 127.0396 })];
    service.setLeads(leads1);
    
    // Trigger cache
    service.getLeadsInBounds({
      minLat: 37.5000,
      maxLat: 37.5100,
      minLng: 127.0300,
      maxLng: 127.0500,
    });

    // Change leads
    const leads2 = [createTestLead({ id: '2', latitude: 37.5020, longitude: 127.0400, lat: 37.5020, lng: 127.0400 })];
    service.setLeads(leads2);

    // Should get new leads, not cached old ones
    const results = service.getLeadsInBounds({
      minLat: 37.5000,
      maxLat: 37.5100,
      minLng: 127.0300,
      maxLng: 127.0500,
    });

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('2');
  });

  it('should provide cache stats', () => {
    service.setLeads([createTestLead()]);
    service.getLeadsInBounds({
      minLat: 37.5000,
      maxLat: 37.5100,
      minLng: 127.0300,
      maxLng: 127.0500,
    });

    const stats = service.getCacheStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('hitRate');
    expect(stats.size).toBeGreaterThanOrEqual(0);
  });
});