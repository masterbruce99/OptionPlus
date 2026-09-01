# Options Trading Command Center

A professional, production-quality dashboard for learning options trading, translating complex terminology into plain English, built with Next.js and real market data.

## Architecture Overview

This project is built using a clean Next.js App Router architecture:
- **Frontend UI**: Built with React and Vanilla CSS for maximum flexibility and clean aesthetics.
- **Backend/API**: Next.js API Routes (`/app/api/...`) securely proxy requests to market data providers, keeping API keys safe on the server.
- **Market Data Providers**: An abstracted `MarketDataProvider` interface supports multiple backend providers. Tradier is implemented out of the box.
- **Calculation Engine**: `src/lib/calculations.ts` provides a thoroughly tested, reusable layer for determining Greeks, implied volatility, intrinsic/extrinsic value, and break-even points, gracefully handling nulls or zeroes.
- **Educational Engine**: `src/lib/educationalEngine.ts` maps technical metrics (Delta, Gamma, etc.) into simple, plain English and position-specific impact statements.

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

## Phase 2 Functionality

### Beginner & Advanced Modes
- **Beginner Mode:** Hides complex Greeks and emphasizes risk profiling, Break-even calculation, Liquidity, and Time to Expiration in plain English.
- **Advanced Mode:** Exposes all quantitative fields, including Delta, Gamma, Theta, Vega, and Implied Volatility.

### Options Chain Intelligence
- **Strike Centering:** In-The-Money (ITM) options are highlighted in subtle green, while Out-Of-The-Money (OTM) options remain clear. The At-The-Money (ATM) strike is explicitly tagged.
- **Option Detail Panel:** Clicking any quote row opens a detailed panel outlining exactly what the option represents, calculating its Intrinsic vs Extrinsic value, determining liquidity levels, and stating the Trade Direction (Bullish/Bearish).

## Real-Data-Only Enforcement

The application enforces a strict "Real Data Only" policy.
- No mock data or fake JSON responses are used.
- If an API key is missing or invalid, the backend explicitly returns a `503 Service Unavailable` or `500 Internal Server Error`.
- The frontend gracefully catches this and displays a "Configuration Error" banner, preventing the silent substitution of fake prices.
- When fields like Greeks are unavailable from the provider, the UI displays `-` rather than fabricating numbers.

## Data Assumptions & Freshness
- The application displays the current underlying price and explicitly notes that the data freshness depends on the provider (e.g. real-time or delayed). 
- All calculations assume a standard **100 share multiplier** per option contract.
- Break-even assumes holding the option until expiration without exercising early.

## Development Workflow & GitHub Commit

1. Make changes on a feature branch.
2. Run tests to verify the calculation logic and educational engine:
   ```bash
   npm test
   # Or using Node test runner: npx tsx src/lib/calculations.test.ts
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

## Phase 4 — Arbitrage & Pricing-Dislocation Engine

### Overview

Phase 4 implements an **analytical arbitrage scanner** for identifying potential pricing dislocations. It is **not** an automated trading system and cannot place orders.

### Implemented Analyses

#### Put-Call Parity
Formula: `C - P = S - PV(K) - PV(D)`

Where:
- `C` = call price, `P` = put price, `S` = stock price
- `PV(K)` = present value of strike (discounted at risk-free rate)
- `PV(D)` = present value of dividends (continuous approximation)

**Executable analysis**: BUY uses ASK price; SELL uses BID price. The midpoint is displayed separately as *THEORETICAL MIDPOINT ANALYSIS* and is never classified as executable arbitrage.

#### Conversion
Structure: Long Stock + Long Put + Short Call (same strike/expiration).

At expiration, the position value equals exactly the strike price. The gross edge = `call_bid - put_ask + strike - stock_price`. Financing cost on the long stock reduces the net edge.

#### Reversal
Structure: Short Stock + Long Call + Short Put (same strike/expiration).

The economic opposite of a conversion. **Critical**: short stock requires borrowing shares. Borrow cost is never assumed to be zero — it is marked `UNCONFIGURED` until explicitly set.

#### Synthetic Stock
Long Call + Short Put at same strike/expiration replicates stock exposure. The cost difference vs. actual stock exposure is evaluated using executable bid/ask prices, adjusted for interest rate and dividend data.

#### Box Spread
Four legs: Bull Call Spread + Bear Put Spread at the same strikes.

The box always pays exactly `K2 - K1` at expiration. This is a **financing transaction**, not a risk-free trade. The implied annualized financing rate is computed and compared to the benchmark T-Bill rate.

#### Vertical Spread Bounds
A call (or put) debit spread cannot be worth more than its strike width at expiration. The scanner checks for violations at both midpoint (theoretical) and executable (bid/ask) levels. Midpoint violations are clearly distinguished from executable violations.

### Bid/Ask Treatment

- **All executable analysis uses**: BUY at ASK, SELL at BID
- **Midpoints** are computed and displayed as `THEORETICAL MIDPOINT ANALYSIS` only
- The system never classifies a midpoint-profitable trade as executable arbitrage

### Transaction Cost Treatment

Estimated costs per contract:
- Commission (2× per leg: open + close): `$0.65/leg`
- Exchange fees: `$0.30/leg`
- Regulatory fees: `$0.03/leg`
- Slippage: `0.5%` of premium transacted (configurable)
- Financing: `riskFreeRate × capital × (DTE/365)`
- Borrow cost (short stock): `UNCONFIGURED by default` — net edge is `UNDETERMINED` until configured

**Rule**: Unknown cost ≠ zero cost. If any required cost cannot be determined, `Net Edge = UNDETERMINED`.

### Financing

Financing is calculated as: `capital_requirement × risk_free_rate × (dte / 365)`.

The risk-free rate is fetched from the U.S. Treasury FiscalData API (T-Bill average rate). If unavailable, the rate is marked `UNAVAILABLE` and calculations are flagged.

### Dividends

Dividend data is never silently substituted with zero. Possible states:
- `REAL_DATA`: provided by the market data provider
- `USER_INPUT`: manually entered by the user
- `UNAVAILABLE`: not provided — calculations are flagged

### Liquidity

Each arbitrage pair is assessed for:
- Volume < 10 → penalized
- Open interest < 100 → penalized  
- Bid/ask spread > 10% of midpoint → flagged as `NOT_EXECUTABLE`

### Stale Quote Protection

Quote timestamps are evaluated when available. Maximum acceptable age is configurable (default: 5 minutes). If timestamp is unavailable, the candidate is flagged as `EXECUTION_UNVERIFIED`.

### Opportunity Classifications

| Classification | Meaning |
|---|---|
| `NO_DISLOCATION` | No apparent pricing imbalance |
| `THEORETICAL_DISLOCATION` | Midpoint-visible only; not executable |
| `POTENTIAL_ARBITRAGE` | Executable gross edge positive; costs unconfigured |
| `POSITIVE_AFTER_CONFIGURED_COSTS` | Net edge positive after all configured costs |
| `EXECUTION_UNCERTAIN` | Wide spreads, stale quotes, or low liquidity |
| `INSUFFICIENT_DATA` | Required data missing |

### Known Limitations

- **Early assignment**: American-style options can be exercised before expiration, disrupting the fixed-payoff structure of conversions, reversals, and box spreads.
- **Borrow cost**: Reversal and short-stock strategies require share borrowing; actual rates can be very high for hard-to-borrow names.
- **Multi-leg execution risk**: Simultaneous fills across 2–4 legs may be impossible at the analyzed prices.
- **Dividend accuracy**: Continuous dividend yield approximation may differ from discrete dividend payments.
- **Rate freshness**: Treasury bill rate is cached for 1 hour; intraday rate changes are not reflected.
- **Commissions**: Default cost estimates may not match your broker's actual schedule.
- **No order execution**: This phase is analytical only. No brokerage integration is provided.
