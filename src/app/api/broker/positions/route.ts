// Phase 20: Secure Broker API Route — Positions (Read-Only)
// Server-side only. Credentials from environment variables.
// Never performs writes. Never returns credentials.

import { NextResponse } from 'next/server';

function getApiKey(): string | null {
  return process.env.BROKER_API_KEY ?? null;
}

function getProvider(): string {
  return process.env.BROKER_PROVIDER ?? 'NOT_CONFIGURED';
}

export async function GET() {
  const apiKey = getApiKey();
  const provider = getProvider();

  if (!apiKey) {
    return NextResponse.json(
      {
        connectionState: 'NOT_CONFIGURED',
        positions: [],
        message: 'No broker configured. Set BROKER_API_KEY in server environment.',
      },
      { status: 200 }
    );
  }

  // Production: call real broker positions endpoint here.
  // Example (Tradier):
  //   const res = await fetch('https://api.tradier.com/v1/accounts/{id}/positions', {
  //     headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  //   });
  //   const raw = await res.json();
  //   const positions = (raw?.positions?.position ?? []).map(p => parseBrokerPosition(p, provider, '/positions'));

  void provider; // used only in real integration

  return NextResponse.json(
    {
      connectionState: 'CONFIGURED',
      positions: [],
      message: 'Broker positions endpoint configured. Provide a real broker integration.',
    },
    { status: 200 }
  );
}

// SECURITY: No mutation handlers. Read-only.
