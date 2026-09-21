import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, test, expect, vi } from 'vitest';
import Approvals from './Approvals';

const pending = [
  { id: 8, user_id: 4, employee_name: 'Kasun Perera', leave_type_id: 2, start_date: '2026-10-09', end_date: '2026-10-09',
    reason: 'Family function', status: 'PENDING', days: 1, remaining_days: 7, remaining_after: 6 },
  { id: 7, user_id: 2, employee_name: 'Ishara Fernando', leave_type_id: 1, start_date: '2026-10-05', end_date: '2026-10-07',
    reason: 'Trip', status: 'PENDING', days: 3, remaining_days: 10, remaining_after: 7 },
];
const history = [
  { id: 5, user_id: 2, employee_name: 'Ishara Fernando', leave_type_id: 1, start_date: '2026-03-09', end_date: '2026-03-10',
    status: 'REJECTED', decided_by_name: 'Ruwan Jayasuriya', days: 2 },
];

function mockApi() {
  const fetchMock = vi.fn(async (url) => {
    const body = url === '/api/team/requests' ? pending : url === '/api/team/requests?history=true' ? history : [];
    return { ok: true, status: 200, json: async () => body };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('Approvals (manager)', () => {
  test('each card shows the balance before and after approving ("10 → 7 after")', async () => {
    mockApi();
    render(<Approvals />);
    expect(await screen.findByTestId('balance-after-7')).toHaveTextContent('Annual balance 10 → 7 after');
    expect(screen.getByTestId('balance-after-8')).toHaveTextContent('Casual balance 7 → 6 after');
  });

  test('keeps the server order: newest first', async () => {
    mockApi();
    render(<Approvals />);
    await screen.findByTestId('approval-7');
    const cards = screen.getAllByTestId(/^approval-/).map((el) => el.dataset.testid);
    expect(cards).toEqual(['approval-8', 'approval-7']);
  });

  test('the History link shows approved and rejected requests with who decided', async () => {
    const user = userEvent.setup();
    const fetchMock = mockApi();
    render(<Approvals />);
    await screen.findByTestId('approval-7');
    const link = screen.getByRole('button', { name: /History: approved & rejected requests/ });
    expect(link).toHaveAttribute('aria-expanded', 'false');
    await user.click(link);
    const row = await screen.findByTestId('history-5');
    expect(within(row).getByText('REJECTED')).toBeInTheDocument();
    expect(row).toHaveTextContent('decided by Ruwan Jayasuriya');
    expect(fetchMock).toHaveBeenCalledWith('/api/team/requests?history=true', expect.anything());
    expect(link).toHaveAttribute('aria-expanded', 'true');
  });

  test('a half-day card shows AM/PM and names the half-day date (AC-18.6)', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => ({ ok: true, status: 200, json: async () => (url === '/api/team/requests' ? [
      { id: 11, user_id: 2, employee_name: 'Ishara Fernando', leave_type_id: 1, start_date: '2026-05-04', end_date: '2026-05-06',
        day_part: 'AM', status: 'PENDING', days: 2.5, remaining_days: 10, remaining_after: 7.5 },
      { id: 12, user_id: 4, employee_name: 'Kasun Perera', leave_type_id: 2, start_date: '2026-10-09', end_date: '2026-10-09',
        day_part: 'PM', status: 'PENDING', days: 0.5, remaining_days: 7, remaining_after: 6.5 },
    ] : []) })));
    render(<Approvals />);
    const range = await screen.findByTestId('approval-11');
    expect(within(range).getByText('AM')).toBeInTheDocument();
    expect(within(range).getByTestId('dates-11')).toHaveTextContent('2026-05-04 → 2026-05-06 · 2026-05-06 AM');
    expect(range).toHaveTextContent('Annual · 2.5 days');
    expect(within(range).getByTestId('balance-after-11')).toHaveTextContent('Annual balance 10 → 7.5 after');
    const single = screen.getByTestId('approval-12');
    expect(within(single).getByText('PM')).toBeInTheDocument();
    expect(within(single).getByTestId('dates-12')).toHaveTextContent('2026-10-09 PM');
    expect(single).toHaveTextContent('Casual · 0.5 days');
  });
});
