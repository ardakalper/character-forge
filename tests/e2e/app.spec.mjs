import { test, expect } from '@playwright/test';

async function fresh(page) {
  await page.goto('/?nosw=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__cf);
}
const tab = (page, id) => page.click(`#tabs button[data-tab="${id}"]`);
const card = (page, id) => page.click(`.opt-card[data-id="${id}"]`);
const pill = (page, id) => page.click(`.pill[data-id="${id}"]`);
const evalR = (page, fn) => page.evaluate(`(() => { const cf = window.__cf; const R = cf.R; const c = cf.ch(); return (${fn})(cf, R, c); })()`);
async function setLevel(page, n) { await tab(page, 'abilities'); await page.locator('.lvl-row input[type="range"]').fill(String(n)); }

test.beforeEach(async ({ page }) => { await fresh(page); });

test('loads with seven steps, a summary and the SRD attribution', async ({ page }) => {
  await expect(page).toHaveTitle('Character Forge');
  await expect(page.locator('#tabs button')).toHaveCount(7);
  await expect(page.locator('#summary .nm')).toHaveText('Unnamed hero');
  await expect(page.locator('.foot')).toContainText('System Reference Document 5.1');
  await expect(page.locator('#todo li')).not.toHaveCount(0);
});

test('point buy enforces the 27-point budget, standard array swaps values', async ({ page }) => {
  // standard array: picking an already-used value swaps the two abilities
  const str = page.locator('.ab-cell[data-ab="str"] select');
  await str.selectOption('8');
  await expect(page.locator('.ab-cell[data-ab="cha"] select')).toHaveValue('15');
  // point buy
  await page.locator('#main select').first().selectOption('points');
  await expect(page.locator('#points-left')).toContainText('0 points left');
  const chaMinus = page.locator('.ab-cell[data-ab="cha"] .steps button').first();
  await chaMinus.click(); // 15 → 14 refunds 2 points
  await expect(page.locator('#points-left')).toContainText('2 points left');
  const plus = page.locator('.ab-cell[data-ab="cha"] .steps button').last();
  await plus.click();
  await expect(page.locator('#points-left')).toContainText('0 points left');
  await expect(plus).toBeDisabled();
});

test('a fighter can be built to a finished sheet', async ({ page }) => {
  await tab(page, 'race'); await card(page, 'human');
  await pill(page, 'Elvish'); await pill(page, 'Dwarvish'); await pill(page, 'Giant');
  await tab(page, 'class'); await card(page, 'fighter');
  await pill(page, 'athletics'); await pill(page, 'perception');
  await tab(page, 'gear');
  // chain mail; martial weapon + shield (pick longsword); light crossbow; dungeoneer's pack
  await page.locator('.pill[data-eq="0:0"]').click();
  await page.locator('.pill[data-eq="1:0"]').click();
  await page.locator('select[data-eq="1:cat"]').selectOption('longsword');
  await page.locator('.pill[data-eq="2:0"]').click();
  await page.locator('.pill[data-eq="3:0"]').click();
  await expect(page.locator('#todo .done')).toHaveText('All choices made. The sheet is ready.');
  await expect(page.locator('#main')).toContainText('Armor class: 18 (Chain Mail + shield)');
  await tab(page, 'background');
  await page.locator('#main input[type="text"]').first().fill('Sir Test');
  await tab(page, 'sheet');
  await expect(page.locator('.sh-name .big')).toHaveText('Sir Test');
  await expect(page.locator('.sh-cell.big3 .v').first()).toHaveText('18');
  const hp = await evalR(page, '(cf, R, c) => R.maxHp(cf.data, c)');
  expect(hp).toBe(12);
  await expect(page.locator('.sh-table')).toContainText('Longsword');
  await expect(page.locator('.sh-table')).toContainText('+5');
  await expect(page.locator('#btn-print')).toBeVisible();
});

test('wizard spell picks are capped and shown on the sheet', async ({ page }) => {
  await tab(page, 'race'); await card(page, 'gnome');
  await tab(page, 'class'); await card(page, 'wizard');
  await setLevel(page, 3);
  await tab(page, 'spells');
  await expect(page.locator('#main .stat .v').first()).toHaveText('12'); // gnome INT 14: DC 8+2+2
  for (const c of ['fire-bolt', 'mage-hand', 'light']) await pill(page, c);
  await expect(page.locator(`.pill[data-id="prestidigitation"]`)).toBeDisabled();
  const known = await evalR(page, '(cf, R, c) => R.spellInfo(cf.data, c)');
  expect(known.cantrips).toBe(3);
  expect(known.prepared).toBe(2 + 3);
  for (const s of ['magic-missile', 'shield', 'mage-armor', 'misty-step', 'scorching-ray']) await pill(page, s);
  await expect(page.locator(`.pill[data-id="sleep"]`)).toBeDisabled();
  await page.fill('#sp-search', 'missile');
  await expect(page.locator('.pill[data-id="magic-missile"]')).toBeVisible();
  await expect(page.locator('.pill[data-id="sleep"]')).toBeHidden();
  await tab(page, 'sheet');
  await expect(page.locator('.sheet')).toContainText('Spell save DC 12');
  await expect(page.locator('.sheet')).toContainText('Magic Missile');
});

test('ASI cycles +1/+2 and the Grappler feat lands on the sheet', async ({ page }) => {
  await tab(page, 'race'); await card(page, 'half-orc');
  await tab(page, 'class'); await card(page, 'barbarian');
  await setLevel(page, 4);
  await tab(page, 'class');
  await page.locator('.pill[data-asi="4:str"]').click();
  await page.locator('.pill[data-asi="4:str"]').click();
  let ab = await evalR(page, '(cf, R, c) => R.abilities(cf.data, c)');
  expect(ab.str).toBe(15 + 2 + 2);
  await page.locator('.pill[data-asi="4:feat"]').click();
  ab = await evalR(page, '(cf, R, c) => R.abilities(cf.data, c)');
  expect(ab.str).toBe(17);
  await tab(page, 'sheet');
  await expect(page.locator('.sheet')).toContainText('Feat: Grappler');
  await expect(page.locator('.sheet')).toContainText('Unarmored Defense');
});

test('characters persist, export and import round-trip, delete works', async ({ page }) => {
  await tab(page, 'race'); await card(page, 'dwarf'); await card(page, 'hill-dwarf');
  await tab(page, 'background');
  await page.locator('#main input[type="text"]').first().fill('Borin');
  await page.reload(); await page.waitForFunction(() => window.__cf);
  await expect(page.locator('#summary .nm')).toHaveText('Borin');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#btn-export')]);
  expect(dl.suggestedFilename()).toBe('borin.json');
  const fs = await import('node:fs');
  const saved = fs.readFileSync(await dl.path());
  await page.click('#btn-new');
  await expect(page.locator('#summary .nm')).toHaveText('Unnamed hero');
  await page.locator('#file-import').setInputFiles({ name: 'borin.json', mimeType: 'application/json', buffer: saved });
  await expect(page.locator('#summary .nm')).toHaveText('Borin');
  await expect(page.locator('#char-select option')).toHaveCount(3);
  page.on('dialog', (d) => d.accept());
  await page.click('#btn-del');
  await expect(page.locator('#char-select option')).toHaveCount(2);
});

test('themes switch and persist, Turkish UI, no console errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.selectOption('#set-theme', 'gothic');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'gothic');
  await page.selectOption('#set-theme', 'cyber');
  await page.reload(); await page.waitForFunction(() => window.__cf);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'cyber');
  await page.selectOption('#set-lang', 'tr');
  await expect(page.locator('#tabs button').first()).toHaveText('Yetenekler');
  await expect(page.locator('#btn-new')).toHaveText('Yeni karakter');
  await tab(page, 'race');
  await expect(page.locator('#main h2')).toHaveText('Irk');
  expect(errors).toEqual([]);
});
