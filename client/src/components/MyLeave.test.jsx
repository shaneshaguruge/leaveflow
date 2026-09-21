import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, test, expect, vi } from 'vitest';
import MyLeave from './MyLeave';

const balances = [{ id: 1, name: 'Annual', annual_allocation: 14, used_days: 1, pending_days: 0, remaining_days: 13 }];

afterEach(() => vi.unstubAllGlobals());

describe('MyLeave', () => {
  test("the apply form's Cancel takes the user back to the My requests list", async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async (url) => ({
      ok: true, status: 200, json: async () => (url === '/api/balances' ? balances : []),
    })));
    render(<MyLeave />);
    await screen.findByTestId('remaining-1');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { name: 'My requests' })).toHaveFocus();
  });

  test('My requests shows the half-day date with AM/PM and 0.5 days (AC-18.7)', async () => {
    const halfBalances = [{ id: 1, name: 'Annual', annual_allocation: 14, used_days: 0.5, pending_days: 0.5, remaining_days: 13 }];
    const requests = [
      { id: 21, leave_type_id: 1, start_date: '2026-10-09', end_date: '2026-10-09', day_part: 'PM', days: 0.5, status: 'PENDING', reason: 'Bank' },
      { id: 20, leave_type_id: 1, start_date: '2026-10-05', end_date: '2026-10-07', day_part: 'AM', days: 2.5, status: 'APPROVED', reason: null },
    ];
    vi.stubGlobal('fetch', vi.fn(async (url) => ({
      ok: true, status: 200, json: async () => (url === '/api/balances' ? halfBalances : requests),
    })));
    render(<MyLeave />);
    expect(await screen.findByTestId('dates-21')).toHaveTextContent('2026-10-09 PM · Bank');
    expect(screen.getByTestId('request-21')).toHaveTextContent('Annual · 0.5 days');
    expect(screen.getByTestId('dates-20')).toHaveTextContent('2026-10-05 → 2026-10-07 · 2026-10-07 AM');
    expect(screen.getByTestId('request-20')).toHaveTextContent('Annual · 2.5 days');
    expect(screen.getByTestId('used-1')).toHaveTextContent('0.5');
  });
});
