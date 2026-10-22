import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const files = ['GridView.tsx', 'ListView.tsx', 'ResponsiveLeadManager.tsx', 'VirtualizedGrid.tsx', 'RegionFilter.tsx', 'schedule/ScheduleCalendar.tsx'];

describe('native interaction source contracts', () => {
  it.each(files)('%s uses native controls without clickable containers or nested buttons', (file) => {
    const source = ts.createSourceFile(file, readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const problems: string[] = [];
    function visit(node: ts.Node, insideButton = false) {
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const opening = ts.isJsxElement(node) ? node.openingElement : node;
        const tag = opening.tagName.getText(source);
        const attrs = opening.attributes.properties.filter(ts.isJsxAttribute);
        if (attrs.some(a => a.name.getText(source) === 'onClick') && /^[a-z]/.test(tag) && !['button', 'a', 'select', 'input'].includes(tag)) problems.push(`clickable ${tag}`);
        if (tag === 'button' && insideButton) problems.push('nested button');
        if (tag === 'button' && !attrs.some(a => a.name.getText(source) === 'type' && a.initializer?.getText(source) === '"button"')) problems.push('implicit submit button');
        if (ts.isJsxElement(node)) node.children.forEach(child => visit(child, insideButton || tag === 'button'));
        return;
      }
      ts.forEachChild(node, child => visit(child, insideButton));
    }
    visit(source);
    expect(problems).toEqual([]);
  });
});
