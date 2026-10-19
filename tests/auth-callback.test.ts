import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../src/app/auth/callback/route';

const mockExchangeCodeForSession = vi.fn();
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
      getUser: mockGetUser,
    },
  })),
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

describe('Auth Callback Route Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to login error if code is missing', async () => {
    const request = new Request('http://localhost:3000/auth/callback');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/login?error=auth_callback_failed');
  });

  it('redirects to login error if error param is present in URL', async () => {
    const request = new Request('http://localhost:3000/auth/callback?error=access_denied&error_description=User+cancelled');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/login?error=auth_callback_failed');
  });

  it('redirects to login error if code exchange fails', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: null,
      error: new Error('Invalid authorization code'),
    });

    const request = new Request('http://localhost:3000/auth/callback?code=bad-code');
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get('location');
    expect(location).toContain('/login?error=auth_callback_failed');
  });

  it('exchanges code for session and creates profile if missing', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: 'valid' } },
      error: null,
    });
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'googleuser@gmail.com',
          user_metadata: {
            full_name: 'Google User',
            avatar_url: 'https://lh3.googleusercontent.com/avatar',
          },
        },
      },
      error: null,
    });

    const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });

    const request = new Request('http://localhost:3000/auth/callback?code=valid-code');
    const response = await GET(request);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('valid-code');
    expect(mockInsert).toHaveBeenCalledWith({
      id: 'user-123',
      email: 'googleuser@gmail.com',
      full_name: 'Google User',
      avatar_url: 'https://lh3.googleusercontent.com/avatar',
      role: 'customer',
    });
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/profile');
  });

  it('respects safe relative redirect target', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: 'valid' } },
      error: null,
    });
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'googleuser@gmail.com',
          user_metadata: { name: 'Google User' },
        },
      },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'user-123', full_name: 'Google User', avatar_url: null },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });

    const request = new Request('http://localhost:3000/auth/callback?code=valid-code&next=/orders');
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/orders');
  });

  it('prevents open redirect attacks and falls back to /profile', async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: 'valid' } },
      error: null,
    });
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'googleuser@gmail.com',
        },
      },
      error: null,
    });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'user-123', full_name: 'User', avatar_url: null },
            error: null,
          }),
        }),
      }),
    });

    // Attempting protocol-relative or external URL
    const request = new Request('http://localhost:3000/auth/callback?code=valid-code&next=//malicious-site.com');
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/profile');
  });
});
