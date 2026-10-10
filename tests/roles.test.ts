import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireRole } from '../src/lib/auth/roles';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

describe('Admin Role Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows access if role matches', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'test@test.com' } }, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'u1', role: 'admin' }, error: null }),
        })
      })
    });

    const user = await requireRole(['admin']);
    expect(user.role).toBe('admin');
  });

  it('throws FORBIDDEN if role does not match', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u2' } }, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'u2', role: 'pharmacist' }, error: null }),
        })
      })
    });

    await expect(requireRole(['admin'])).rejects.toThrow('FORBIDDEN');
  });
});
