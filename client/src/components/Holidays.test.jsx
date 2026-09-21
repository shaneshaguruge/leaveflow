import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, test, expect, vi } from 'vitest';
import Holidays from './Holidays';

const YEAR = String(new Date().getFullYear());
const list = [
  { date: `${YEAR}-05-01`, name: 'Vesak Full Moon Poya Day + International Labour Day', year: Number(YEAR),
    note: 'to confirm against the official gazette' },
  { date: `${YEAR}-12-25`, name: 'Christmas Day', year: Number(YEAR), note: null },
];

// Minimal fake of the /api/holidays endpoints; records every call.
function fakeApi({ post, del } = {}) {
  const calls = [];
  const fetchMock = vi.fn(async (url, init = {}) => {
    calls.push({ url, method: init.method || 'GET', body: init.body && JSON.parse(init.body) });
    const [status, body] = init.method === 'POST' ? post : init.method === 'DELETE' ? del : [200, list];
    return { ok: status < 400, status, json: async () => body };
  });
  vi.stubGlobal('fetch', fetchMock);
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe('Holidays (HR, US-21)', () => {
  test("lists the year's holidays with names and the gazette note (AC-21.1)", async () => {
    const calls = fakeApi();
    render(<Holidays />);
    const vesak = await screen.findByTestId(`holiday-${YEAR}-05-01`);
    expect(vesak).toHaveTextContent('Vesak Full Moon Poya Day + International Labour Day');
    expect(vesak).toHaveTextContent('to confirm against the official gazette');
    expect(screen.getByText(`2 holidays in ${YEAR} · 1 to confirm against the official gazette`)).toBeInTheDocument();
    expect(calls[0]).toMatchObject({ url: `/api/holidays?year=${YEAR}`, method: 'GET' });
  });

  test('adding posts date and name, then reports the approved requests that got days back (AC-21.2, AC-21.5)', async () => {
    const user = userEvent.setup();
    const calls = fakeApi({ post: [201, {
      holiday: { date: `${YEAR}-10-14`, name: 'Special bank holiday', year: Number(YEAR), note: null },
      adjusted: [{ id: 6, employee_name: 'Ishara Fernando', days_before: 0.5, days_after: 0 }],
    }] });
    render(<Holidays />);
    await screen.findByTestId(`holiday-${YEAR}-05-01`);
    const form = screen.getByRole('form', { name: 'Add a holiday' });
    await user.type(within(form).getByLabelText('Date'), `${YEAR}-10-14`);
    await user.type(within(form).getByLabelText('Name'), 'Special bank holiday');
    await user.click(within(form).getByRole('button', { name: 'Add holiday' }));
    expect(calls.find((c) => c.method === 'POST')).toEqual({
      url: '/api/holidays', method: 'POST', body: { date: `${YEAR}-10-14`, name: 'Special bank holiday' } });
    expect(await screen.findByRole('status')).toHaveTextContent(
      `Added ${YEAR}-10-14 Special bank holiday. 1 approved request got days back: Ishara Fernando (0.5 → 0).`);
  });

  test('a duplicate date shows the API error (409)', async () => {
    const user = userEvent.setup();
    fakeApi({ post: [409, { error: { code: 'HOLIDAY_EXISTS', message: `${YEAR}-05-01 is already a holiday` } }] });
    render(<Holidays />);
    await screen.findByTestId(`holiday-${YEAR}-05-01`);
    const form = screen.getByRole('form', { name: 'Add a holiday' });
    await user.type(within(form).getByLabelText('Date'), `${YEAR}-05-01`);
    await user.type(within(form).getByLabelText('Name'), 'Labour Day');
    await user.click(within(form).getByRole('button', { name: 'Add holiday' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(`${YEAR}-05-01 is already a holiday`);
  });

  test('deleting calls DELETE and says who was not re-charged (AC-21.3, AC-21.6)', async () => {
    const user = userEvent.setup();
    const calls = fakeApi({ del: [200, {
      deleted: { date: `${YEAR}-12-25`, name: 'Christmas Day', year: Number(YEAR) },
      not_recharged: [{ id: 3, employee_name: 'Kasun Perera' }],
    }] });
    render(<Holidays />);
    await user.click(await screen.findByRole('button', { name: `Delete ${YEAR}-12-25 Christmas Day` }));
    expect(calls.find((c) => c.method === 'DELETE').url).toBe(`/api/holidays/${YEAR}-12-25`);
    expect(await screen.findByRole('status')).toHaveTextContent(
      `Deleted ${YEAR}-12-25 Christmas Day. 1 approved request covers this date and was not re-charged: Kasun Perera.`);
  });
});
