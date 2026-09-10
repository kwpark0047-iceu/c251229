# Periodic Test Result Maintenance

## Maintenance Schedule

### Daily
- Check for new test results in `test-results/` directory
- Review failed test summaries for critical issues
- Clean up old test artifact directories (> 7 days)

### Weekly
- Run full test suite to ensure no regressions
- Archive test results older than 14 days
- Review test coverage metrics
- Update this maintenance guide

### Monthly
- Comprehensive test result analysis
- Update test data and fixtures if needed
- Review Chromium test performance trends
- Clean up test-results directory completely

## Maintenance Script

```bash
#!/bin/bash
# periodic-test-maintenance.sh
# Run weekly to maintain test results hygiene

set -e

PROJECT_DIR="/mnt/d/c251229"
TEST_DIR="${PROJECT_DIR}/test-results"

echo "=== Periodic Test Result Maintenance ==="
echo "Date: $(date)"

# Remove test artifacts older than 7 days
echo "Cleaning test artifacts older than 7 days..."
find "${TEST_DIR}" -type d -name "map-data-service-*" -mtime +7 -exec rm -rf {} \; 2>/dev/null || true

# Remove video test artifacts
echo "Removing video test artifacts..."
find "${TEST_DIR}" -type f \( -name "*.webm" -o -name "*.mp4" \) -delete 2>/dev/null || true

# Clean up error context files older than 14 days
echo "Cleaning error context files older than 14 days..."
find "${TEST_DIR}" -type f -name "error-context.md" -mtime +14 -delete 2>/dev/null || true

# Generate maintenance report
echo "Maintenance complete."
echo "Remaining test artifacts: $(find "${TEST_DIR}" -type f 2>/dev/null | wc -l)"
```

## Checklist

- [ ] Review `test-results/` directory for artifacts needing cleanup
- [ ] Run `npm test` to verify no regressions
- [ ] Archive important test results to external storage
- [ ] Update this maintenance guide as needed
- [ ] Commit cleanup changes with proper documentation

## Notes

- Test results from Chromium automated tests include screenshots, videos, and error contexts
- Critical test results should be preserved; non-critical artifacts can be safely removed
- Always verify before bulk-deleting test artifacts
- Maintenance should be performed after feature branches are merged to master