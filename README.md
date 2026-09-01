# Options Trading Command Center

A professional, production-quality dashboard for learning options trading, translating complex terminology into plain English, built with Next.js and real market data.

## Architecture Overview

This project is built using a clean Next.js App Router architecture:
- **Frontend UI**: Built with React and Vanilla CSS for maximum flexibility and clean aesthetics.
- **Backend/API**: Next.js API Routes (`/app/api/...`) securely proxy requests to market data providers, keeping API keys safe on the server.
- **Market Data Providers**: An abstracted `MarketDataProvider` interface supports multiple backend providers. Tradier is implemented out of the box.
- **Educational Engine**: A dedicated module (`src/lib/educationalEngine.ts`) maps technical metrics (Delta, Gamma, etc.) into simple, plain English and position-specific impact statements.

## Setup Instructions

1. Clone the repository and navigate to the project root:
   ```bash
   git clone https://github.com/masterbruce99/OptionPlus.git
   cd OptionPlus
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment variables example:
   ```bash
   cp .env.example .env.local
   ```
4. Add your API keys to `.env.local` (e.g., `TRADIER_API_KEY`).

5. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

- `MARKET_DATA_PROVIDER`: The chosen provider (defaults to `tradier`).
- `TRADIER_API_KEY`: Your real Tradier API Key.
- `POLYGON_API_KEY`: Your Polygon API Key (if implemented).
- `ALPACA_API_KEY`: Your Alpaca API Key (if implemented).

> **Note:** `.env.local` is excluded from Git to prevent secret leakage.

## Supported Providers
- **Tradier** (Implemented via Sandbox by default, easily switched to production)
- *Polygon (Abstraction ready)*
- *Alpaca (Abstraction ready)*

## Real-Data-Only Enforcement

The application enforces a strict "Real Data Only" policy.
- No mock data or fake JSON responses are used.
- If an API key is missing or invalid, the backend explicitly returns a `503 Service Unavailable` or `500 Internal Server Error`.
- The frontend gracefully catches this and displays a "Configuration Error" banner, preventing the silent substitution of fake prices.

## Development Workflow & GitHub Commit

1. Make changes on a feature branch.
2. Run tests to verify the educational engine logic:
   ```bash
   npx tsx src/lib/educationalEngine.test.ts
   ```
3. Build the application to verify type safety:
   ```bash
   npm run build
   ```
4. Commit and push:
   ```bash
   git add .
   git commit -m "feat: your meaningful change"
   git push origin main
   ```
