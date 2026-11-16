/** 목록·건수·부가 조회가 오래된 필터 결과를 덮어쓰지 않도록 한다. */
export function createLeadRequestTracker() {
  let generation = 0;
  let activeKey: string | null = null;
  return {
    begin(key: string) {
      if (activeKey === key) return null;
      const id = ++generation;
      activeKey = key;
      return {
        isCurrent: () => id === generation,
        finish() { if (id === generation) activeKey = null; },
      };
    },
    invalidate() { generation++; activeKey = null; },
  };
}
