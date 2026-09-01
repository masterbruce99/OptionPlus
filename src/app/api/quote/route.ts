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
    const quote = await provider.getQuote(symbol);
    return NextResponse.json(quote);
  } catch (error: any) {
    console.error('Quote API Error:', error);
    // Determine if it's a configuration error
    if (error.message && error.message.includes('Provider Not Configured')) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
