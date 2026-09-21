const { test, expect } = require('@playwright/test');

const PASSWORD = 'password123';
const ANNUAL = 1;
// Mon 5 – Wed 7 Oct 2026: three weekdays, no Sri Lankan public holiday, no overlap with seeded requests.
const START = '2026-10-05';
const END = '2026-10-07';
const DAYS = 3;

// Each user gets their own browser context, so their tokens (localStorage) never mix.
async function login(browser, email) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  return page;
}

async function annualCard(page) {
  const read = async (id) => Number(await page.getByTestId(`${id}-${ANNUAL}`).innerText());
  await expect(page.getByTestId(`remaining-${ANNUAL}`)).toHaveText(/^-?\d+$/);
  return { remaining: await read('remaining'), used: await read('used'), reserved: await read('reserved') };
}

test('employee applies, manager approves, employee sees APPROVED and her balance change', async ({ browser }) => {
  const reason = `Trip to Kandy ${Date.now()}`;

  // Ishara applies
  const ishara = await login(browser, 'ishara@ceylonroots.lk');
  const before = await annualCard(ishara);
  const form = ishara.getByRole('form', { name: 'Apply for leave' });
  await form.getByLabel('Leave type').selectOption({ label: 'Annual' });
  await form.getByLabel('Start date').fill(START);
  await form.getByLabel('End date').fill(END);
  await expect(form.getByTestId('balance-line'))
    .toHaveText(`= ${DAYS} working days · ${before.remaining - DAYS} remaining`);
  await form.getByLabel('Reason').fill(reason);
  await form.getByRole('button', { name: 'Apply' }).click();

  const myRow = ishara.getByRole('listitem').filter({ hasText: reason });
  await expect(myRow).toContainText('PENDING');
  await expect(ishara.getByTestId(`reserved-${ANNUAL}`)).toHaveText(String(before.reserved + DAYS));
  await expect(ishara.getByTestId(`remaining-${ANNUAL}`)).toHaveText(String(before.remaining - DAYS));

  // Ruwan (her manager) approves it on the Approvals page
  const ruwan = await login(browser, 'ruwan@ceylonroots.lk');
  await ruwan.getByRole('navigation').getByRole('button', { name: 'Approvals' }).click();
  const inbox = ruwan.getByRole('listitem').filter({ hasText: reason });
  await expect(inbox).toContainText('Ishara Fernando');
  // US-16: before deciding, Ruwan sees who else on his team is off. Nobody overlaps 5–7 Oct...
  await expect(inbox.getByRole('region', { name: 'Team that week' })).toContainText('No one else is off');
  // ...while the seeded Bank appointment (16 Nov) overlaps Kasun's seeded approved leave (16–18 Nov).
  const bankDay = ruwan.getByRole('listitem').filter({ hasText: 'Bank appointment' });
  await expect(bankDay.getByRole('region', { name: 'Team that week' })).toContainText('Kasun Perera');
  await inbox.getByRole('button', { name: 'Approve' }).click();
  await expect(inbox).toHaveCount(0); // refetched: no longer pending

  // Ishara sees APPROVED, and the days moved from "reserved" to "used"
  await ishara.reload();
  await expect(myRow).toContainText('APPROVED');
  await expect(ishara.getByTestId(`used-${ANNUAL}`)).toHaveText(String(before.used + DAYS));
  await expect(ishara.getByTestId(`reserved-${ANNUAL}`)).toHaveText(String(before.reserved));
  await expect(ishara.getByTestId(`remaining-${ANNUAL}`)).toHaveText(String(before.remaining - DAYS));
});

test('fits a 360px phone: no horizontal scroll, tap-sized buttons', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByLabel('Email').fill('dilini@ceylonroots.lk'); // HR_ADMIN sees every nav link
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();

  for (const tab of ['My leave', 'Approvals', 'All requests']) {
    await page.getByRole('navigation').getByRole('button', { name: tab }).click();
    await expect(page.getByRole('heading', { level: 2, name: tab === 'My leave' ? 'My balances' : tab })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow on ${tab}`).toBeLessThanOrEqual(0);
    for (const button of await page.getByRole('button').all()) {
      const box = await button.boundingBox();
      if (box) expect(box.height, `button height on ${tab}`).toBeGreaterThanOrEqual(44);
    }
  }
});

test('login shows the API error on 401, and a bad stored token lands back on Login', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Email').fill('ishara@ceylonroots.lk');
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('alert')).toHaveText('Wrong email or password');

  await page.evaluate(() => localStorage.setItem('token', 'not-a-real-jwt'));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
});
