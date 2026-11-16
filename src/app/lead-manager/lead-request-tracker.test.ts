import { describe, expect, it } from 'vitest';
import { createLeadRequestTracker } from './lead-request-tracker';

describe('latest lead request', () => {
  it('deduplicates in-flight requests and permits refresh after completion', () => {
    const tracker = createLeadRequestTracker();
    const first = tracker.begin('same')!;
    expect(tracker.begin('same')).toBeNull();
    first.finish();
    expect(tracker.begin('same')).not.toBeNull();
    expect(first.isCurrent()).toBe(false);
  });
  it('rejects stale list/count completions without clearing a newer request', () => {
    const tracker = createLeadRequestTracker();
    const old = tracker.begin('old')!;
    const latest = tracker.begin('new')!;
    old.finish();
    expect(old.isCurrent()).toBe(false);
    expect(latest.isCurrent()).toBe(true);
    expect(tracker.begin('new')).toBeNull();
    latest.finish();
    expect(latest.isCurrent()).toBe(true);
  });
  it('invalidates on unmount while allowing the StrictMode restart', () => {
    const tracker = createLeadRequestTracker();
    const old = tracker.begin('same')!;
    tracker.invalidate();
    expect(old.isCurrent()).toBe(false);
    expect(tracker.begin('same')).not.toBeNull();
  });
});
