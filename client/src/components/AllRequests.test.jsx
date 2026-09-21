import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, test, expect, vi } from 'vitest';
import AllRequests from './AllRequests';

const rows = [
  { id: 2, user_id: 1, employee_name: 'Ruwan Jayasuriya', leave_type_id: 3, start_date: '2026-02-09', end_date: '2026-02-09',
    reason: 'Fever', status: 'APPROVED', decided_by: 3, decided_by_name: 'Dilini Weerasinghe' },
  { id: 3, user_id: 2, employee_name: 'Ishara Fernando', leave_type_id: 2, start_date: '2026-11-16', end_date: '2026-11-16',
    reason: 'Bank appointment', status: 'PENDING', decided_by: null, decided_by_name: null },
];

function mockFetch(body) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('AllRequests (HR)', () => {
  test('shows each employee by name, not "Employee #id"', async () => {
    mockFetch(rows);
    render(<AllRequests />);
    expect(await screen.findByText(/Ishara Fernando/)).toBeInTheDocument();
    expect(screen.getByText(/Ruwan Jayasuriya/)).toBeInTheDocument();
    expect(screen.queryByText(/Employee #/)).not.toBeInTheDocument();
  });

  test('shows who decided each request, and a dash while it is pending', async () => {
    mockFetch(rows);
    render(<AllRequests />);
    expect(await screen.findByTestId('decided-by-2')).toHaveTextContent('Decided by: Dilini Weerasinghe');
    expect(screen.getByTestId('decided-by-3')).toHaveTextContent('Decided by: —');
  });

  test('the Type filter combines with the Status filter', async () => {
    const user = userEvent.setup();
    mockFetch([...rows,
      { id: 4, user_id: 2, employee_name: 'Ishara Fernando', leave_type_id: 1, start_date: '2026-03-02', end_date: '2026-03-03',
        reason: 'Family wedding', status: 'APPROVED', decided_by: 1, decided_by_name: 'Ruwan Jayasuriya' }]);
    render(<AllRequests />);
    await screen.findByTestId('request-4');
    await user.selectOptions(screen.getByLabelText('Type'), 'Sick');
    expect(screen.getByTestId('request-2')).toBeInTheDocument();
    expect(screen.queryByTestId('request-3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('request-4')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Type'), 'Annual');
    await user.selectOptions(screen.getByLabelText('Status'), 'PENDING');
    expect(screen.getByText('No requests.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Status'), 'APPROVED');
    expect(screen.getByTestId('request-4')).toBeInTheDocument();
    expect(screen.queryByTestId('request-2')).not.toBeInTheDocument();
  });

  test('Export CSV downloads the file for the filters on screen (US-12)', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url) => (url === '/api/leave-requests'
      ? { ok: true, status: 200, json: async () => rows }
      : { ok: true, status: 200, blob: async () => new Blob(['Request ID\r\n'], { type: 'text/csv' }) }));
    vi.stubGlobal('fetch', fetchMock);
    const createObjectURL = vi.fn(() => 'blob:csv');
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL, revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    localStorage.setItem('token', 't');

    render(<AllRequests />);
    await screen.findByTestId('request-2');
    await user.selectOptions(screen.getByLabelText('Year'), '2026');
    await user.selectOptions(screen.getByLabelText('Status'), 'APPROVED');
    await user.selectOptions(screen.getByLabelText('Type'), 'Sick');
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(fetchMock).toHaveBeenLastCalledWith('/api/reports/leave-requests.csv?year=2026&status=APPROVED&type=3',
      { headers: { Authorization: 'Bearer t' } });
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

  test('uses the server working-day count (holidays excluded) when the API sends one', async () => {
    mockFetch([{ ...rows[0], id: 9, start_date: '2026-04-29', end_date: '2026-05-04', days: 3 }]);
    render(<AllRequests />);
    expect(await screen.findByTestId('request-9')).toHaveTextContent('Sick · 3 days');
  });
});
