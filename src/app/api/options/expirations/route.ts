import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/providers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
  }

  try {
    const provider = getProvider();
    const expirations = await provider.getOptionExpirations(symbol);
    return NextResponse.json(expirations);
  } catch (error: unknown) {
    console.error('Expirations API Error:', error);
    const err = error as Error;
    if (err.message && err.message.includes('Provider Not Configured')) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
