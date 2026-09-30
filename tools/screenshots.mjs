// README screenshots: builds a demo character through the real UI, captures each theme.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const exe = process.env.PW_CHROMIUM_PATH;
const OUT = process.env.OUT || 'docs/img';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:4176/?nosw=1');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForFunction(() => window.__cf);
// a level-5 elf wizard named Sylvara
await page.click('#tabs button[data-tab="race"]');
await page.click('.opt-card[data-id="elf"]');
await page.click('.opt-card[data-id="high-elf"]');
for (const l of ['Draconic', 'Dwarvish', 'Celestial']) await page.click(`.pill[data-id="${l}"]`);
await page.click('#tabs button[data-tab="abilities"]');
await page.locator('.lvl-row input[type="range"]').fill('5');
await page.locator('.ab-cell[data-ab="int"] select').selectOption('15');
await page.click('#tabs button[data-tab="class"]');
await page.click('.opt-card[data-id="wizard"]');
await page.click('.pill[data-id="arcana"]'); await page.click('.pill[data-id="investigation"]');
await page.click('.pill[data-asi="4:int"]'); await page.click('.pill[data-asi="4:int"]');
await page.click('#tabs button[data-tab="spells"]');
for (const c of ['fire-bolt', 'mage-hand', 'light', 'prestidigitation']) await page.click(`.pill[data-id="${c}"]`);
for (const s of ['magic-missile', 'shield', 'mage-armor', 'misty-step', 'scorching-ray', 'fireball', 'counterspell', 'fly', 'haste']) await page.click(`.pill[data-id="${s}"]`).catch(() => {});
await page.click('#tabs button[data-tab="gear"]');
for (const [i, j] of [[0, 0], [1, 1], [2, 0]]) await page.click(`.pill[data-eq="${i}:${j}"]`).catch(() => {});
await page.click('#tabs button[data-tab="background"]');
await page.locator('#main input[type="text"]').first().fill('Sylvara Emberquill');
await page.locator('#main select').last().selectOption('chaotic-good');
// class tab in each theme, sheet in parchment
for (const theme of ['parchment', 'gothic', 'cyber']) {
  await page.selectOption('#set-theme', theme);
  await page.click('#tabs button[data-tab="class"]');
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${theme}.png` });
  console.log('wrote', theme);
}
await page.selectOption('#set-theme', 'parchment');
await page.click('#tabs button[data-tab="sheet"]');
await page.waitForTimeout(350);
await page.screenshot({ path: `${OUT}/sheet.png` });
console.log('wrote sheet');
await browser.close();
