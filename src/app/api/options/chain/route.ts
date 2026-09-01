import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/providers';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const expiration = searchParams.get('expiration');

  if (!symbol || !expiration) {
    return NextResponse.json({ error: 'Symbol and expiration are required' }, { status: 400 });
  }

  try {
    const provider = getProvider();
    const chain = await provider.getOptionChain(symbol, expiration);
    return NextResponse.json(chain);
  } catch (error: any) {
    console.error('Chain API Error:', error);
    if (error.message && error.message.includes('Provider Not Configured')) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
