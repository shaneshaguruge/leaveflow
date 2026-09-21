import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, test, expect, vi } from 'vitest';
import ApplyLeaveForm from './ApplyLeaveForm';

const balances = [
  { id: 1, name: 'Annual', annual_allocation: 14, used_days: 2, pending_days: 0, remaining_days: 12 },
  { id: 2, name: 'Casual', annual_allocation: 7, used_days: 0, pending_days: 1, remaining_days: 6 },
  { id: 3, name: 'Sick', annual_allocation: 7, used_days: 0, pending_days: 0, remaining_days: 7 },
];

function mockFetch(status, body) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('ApplyLeaveForm', () => {
  test('submit stays disabled until both dates are valid', async () => {
    const user = userEvent.setup();
    render(<ApplyLeaveForm onCreated={() => {}} />);
    const submit = screen.getByRole('button', { name: /apply/i });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText(/start date/i), '2026-03-02');
    expect(submit).toBeDisabled(); // end date still missing
    await user.type(screen.getByLabelText(/end date/i), '2026-03-06');
    expect(submit).toBeEnabled();
  });

  test('end date before start date is flagged and blocks submit', async () => {
    const user = userEvent.setup();
    render(<ApplyLeaveForm onCreated={() => {}} />);
    await user.type(screen.getByLabelText(/start date/i), '2026-03-06');
    await user.type(screen.getByLabelText(/end date/i), '2026-03-02');
    expect(screen.getByTestId('balance-line')).toHaveTextContent(/on or after the start date/i);
    expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
  });

  test('live balance line counts working days (weekends excluded) against the selected type', async () => {
    const user = userEvent.setup();
    render(<ApplyLeaveForm balances={balances} onCreated={() => {}} />);
    // Fri 2 Oct .. Tue 6 Oct 2026 = Fri, Mon, Tue = 3 working days; Annual has 12 remaining
    await user.type(screen.getByLabelText(/start date/i), '2026-10-02');
    await user.type(screen.getByLabelText(/end date/i), '2026-10-06');
    expect(screen.getByTestId('balance-line')).toHaveTextContent('= 3 working days · 9 remaining');
    await user.selectOptions(screen.getByLabelText(/leave type/i), 'Casual');
    expect(screen.getByTestId('balance-line')).toHaveTextContent('= 3 working days · 3 remaining');
  });

  test('posts the request and calls onCreated on 201', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch(201, { id: 5, status: 'PENDING' });
    const onCreated = vi.fn();
    render(<ApplyLeaveForm balances={balances} onCreated={onCreated} />);
    await user.type(screen.getByLabelText(/start date/i), '2026-10-05');
    await user.type(screen.getByLabelText(/end date/i), '2026-10-07');
    await user.type(screen.getByLabelText(/reason/i), 'Trip to Kandy');
    await user.click(screen.getByRole('button', { name: /apply/i }));
    expect(onCreated).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/leave-requests');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      leave_type_id: 1, start_date: '2026-10-05', end_date: '2026-10-07', reason: 'Trip to Kandy',
    });
  });

  test("shows the server's error message when the API refuses (409)", async () => {
    const user = userEvent.setup();
    mockFetch(409, { error: { code: 'INSUFFICIENT_BALANCE', message: 'Only 6 day(s) of this type left this year' } });
    const onCreated = vi.fn();
    render(<ApplyLeaveForm balances={balances} onCreated={onCreated} />);
    await user.type(screen.getByLabelText(/start date/i), '2026-10-05');
    await user.type(screen.getByLabelText(/end date/i), '2026-10-07');
    await user.click(screen.getByRole('button', { name: /apply/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Only 6 day(s) of this type left this year');
    expect(onCreated).not.toHaveBeenCalled();
  });
});
