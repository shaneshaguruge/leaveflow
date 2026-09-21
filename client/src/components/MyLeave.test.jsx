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
});
