import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, test, expect, vi } from 'vitest';
import TeamWeekPanel from './TeamWeekPanel';
import Approvals from './Approvals';

function mockFetch(handler) {
  const fetchMock = vi.fn(async (url) => {
    const [status, body] = handler(url);
    return { ok: status < 400, status, json: async () => body };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('TeamWeekPanel (US-16)', () => {
  test('asks the API for approved leave overlapping the request dates and lists who is off', async () => {
    const fetchMock = mockFetch(() => [200, [
      { id: 7, employee_name: 'Kasun Perera', start_date: '2026-11-16', end_date: '2026-11-18', status: 'APPROVED' },
    ]]);
    render(<TeamWeekPanel from="2026-11-16" to="2026-11-18" />);
    const panel = screen.getByRole('region', { name: 'Team that week' });
    expect(await within(panel).findByText('Kasun Perera')).toBeInTheDocument();
    expect(panel).toHaveTextContent('2026-11-16 → 2026-11-18');
    expect(fetchMock).toHaveBeenCalledWith('/api/team/requests?from=2026-11-16&to=2026-11-18', expect.anything());
  });

  test('empty state says "No one else is off"', async () => {
    mockFetch(() => [200, []]);
    render(<TeamWeekPanel from="2026-10-05" to="2026-10-07" />);
    expect(await screen.findByText('No one else is off')).toBeInTheDocument();
  });

  test('shows the API error instead of a misleading empty state', async () => {
    mockFetch(() => [403, { error: { code: 'FORBIDDEN', message: 'Your role cannot do this' } }]);
    render(<TeamWeekPanel from="2026-10-05" to="2026-10-07" />);
    expect(await screen.findByText('Your role cannot do this')).toBeInTheDocument();
    expect(screen.queryByText('No one else is off')).not.toBeInTheDocument();
  });

  test('each pending card on the Approvals screen gets its own panel for its own dates', async () => {
    const fetchMock = mockFetch((url) => {
      if (url === '/api/team/requests') {
        return [200, [{ id: 3, user_id: 2, leave_type_id: 2, start_date: '2026-11-16', end_date: '2026-11-16',
          reason: 'Bank appointment', status: 'PENDING', employee_name: 'Ishara Fernando' }]];
      }
      return [200, [{ id: 5, employee_name: 'Kasun Perera', start_date: '2026-11-16', end_date: '2026-11-18', status: 'APPROVED' }]];
    });
    render(<Approvals />);
    const card = await screen.findByTestId('approval-3');
    expect(await within(card).findByText('Kasun Perera')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/team/requests?from=2026-11-16&to=2026-11-16', expect.anything());
  });
});
