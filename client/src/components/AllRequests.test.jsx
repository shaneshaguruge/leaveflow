import { render, screen } from '@testing-library/react';
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
});
