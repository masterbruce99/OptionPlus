// Phase 20: Secure Broker API Route — Account Data
// Server-side only. Credentials come from environment variables.
// Never returns credentials to client. Never performs writes.

import { NextResponse } from 'next/server';
import { redactSecrets } from '@/lib/broker/accountParser';
// parseBrokerAccount is used in the production implementation — see commented example below.

// Credentials are ONLY read server-side from environment variables.
// They are NEVER returned in the response.
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
        account: null,
        message:
          'No broker API key configured. Set BROKER_API_KEY in your environment variables. ' +
          'This is a server-side setting — credentials are never stored in the browser.',
      },
      { status: 200 }
    );
  }

  // In production this would call the actual broker API.
  // We do NOT include a real provider integration in the open-source build
  // because the API key is user-specific and broker-specific.
  // The architecture is production-ready; only the concrete HTTP call is omitted.
  //
  // Example (Tradier):
  //   const res = await fetch('https://api.tradier.com/v1/user/profile', {
  //     headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
  //   });
  //   const raw = await res.json();
  //   const account = parseBrokerAccount(raw?.profile?.account, provider, '/v1/user/profile');
  //
  // Because we have no real key, we return the correct NOT_CONFIGURED state.

  // Log safely — redact any potential secret leaks
  const safeLog = redactSecrets(`Broker request for provider=${provider}`);
  console.log(`[broker/account] ${safeLog}`);

  return NextResponse.json(
    {
      connectionState: 'CONFIGURED',
      account: null,
      message:
        'Broker API key is configured server-side. Connect a real broker integration to retrieve live account data.',
    },
    { status: 200 }
  );
}

// SECURITY GUARANTEE: No POST/PUT/PATCH/DELETE handlers exist.
// This route is strictly GET (read-only).
