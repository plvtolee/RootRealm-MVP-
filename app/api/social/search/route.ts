import { requireSession } from '@/lib/auth/session';
import { searchUsers } from '@/lib/social/queries';
import { NextResponse } from 'next/server';

// Authenticated, cookie-backed endpoint — never attempt static rendering.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireSession();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') ?? '';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0);

    const result = await searchUsers({ query, limit, offset });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed', users: [], total: 0, hasMore: false },
      { status: 500 }
    );
  }
}