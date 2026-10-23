// @vitest-environment node
import { expect, it } from 'vitest';
import config from '../../next.config';

it('pins Turbopack to the checkout used by npm scripts instead of an ancestor lockfile', () => {
  expect(config.turbopack?.root).toBe(process.cwd());
});
