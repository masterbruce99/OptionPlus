// Phase 20: Secure Broker API Route — Fill History (Read-Only)
// Server-side only. Credentials from environment variables.

import { NextResponse } from 'next/server';

function getApiKey(): string | null {
  return process.env.BROKER_API_KEY ?? null;
}

export async function GET() {
  const apiKey = getApiKey();

  if (!apiKey) {
    return NextResponse.json(
      {
        connectionState: 'NOT_CONFIGURED',
        fills: [],
        message: 'No broker configured. Set BROKER_API_KEY in server environment.',
      },
      { status: 200 }
    );
  }

  // Production: call real broker fills endpoint here.
  // Example (Tradier):
  //   const res = await fetch('https://api.tradier.com/v1/accounts/{id}/history', {...});

  return NextResponse.json(
    {
      connectionState: 'CONFIGURED',
      fills: [],
      message: 'Broker fill history endpoint configured. Provide a real broker integration.',
    },
    { status: 200 }
  );
}

// SECURITY: Read-only.
