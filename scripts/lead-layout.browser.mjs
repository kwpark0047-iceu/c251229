import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
const css = fs.readFileSync('src/app/lead-manager/components/lead-actions.module.css', 'utf8');
const output = path.resolve('.local-state/layout-browser-20261023');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.LAYOUT_BROWSER_EXECUTABLE ? { executablePath: process.env.LAYOUT_BROWSER_EXECUTABLE } : {}) });
const results = [];
try {
  const page = await browser.newPage();
  await page.route('**/*', route => route.abort());
  for (const width of [220, 280, 360, 680]) {
    for (const scale of [1, 2]) {
      await page.setViewportSize({ width: width + 40, height: 650 });
      await page.setContent(`<style>:root{--text-primary:#fff}body{margin:20px;background:#101116;color:white}.cardActions{width:${width / scale}px;zoom:${scale}}button{display:flex;align-items:center;justify-content:center;border:1px solid #555;border-radius:8px;color:white;background:#253044} ${css}</style><div class="cardActions">${['통화 기록','제안','삭제','상가 조회'].map(text => `<button type="button"><svg viewBox="0 0 16 16" aria-hidden="true"></svg>${text}</button>`).join('')}</div>`);
      const buttons = await page.locator('button').evaluateAll(nodes => nodes.map(node => {
        const box = node.getBoundingClientRect();
        return { x: box.x, y: box.y, right: box.right, bottom: box.bottom, height: box.height, fits: node.scrollWidth <= node.clientWidth };
      }));
      if (buttons.some(b => !b.fits || b.height < 44 * scale)) throw Error('Clipped label or undersized target');
      for (let i=0;i<buttons.length;i++) for(let j=i+1;j<buttons.length;j++) {
        const a=buttons[i], b=buttons[j];
        if(a.x<b.right && b.x<a.right && a.y<b.bottom && b.y<a.bottom) throw Error('Overlapping buttons');
      }
      results.push({ width, scale, buttons: buttons.length, passed: true });
    }
  }
  await page.screenshot({ path: path.join(output, 'actions.png') });
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ scope: 'isolated-css-fixture-not-application-e2e', results }, null, 2));
  console.log('CSS fixture matrix passed:', results.length);
} finally { await browser.close(); }
