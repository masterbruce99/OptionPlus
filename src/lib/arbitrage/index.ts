/**
 * Phase 4 — Arbitrage Module Index
 * Re-exports all public interfaces for clean imports.
 */

export * from './types';
export * from './engine';
export * from './costEngine';
export * from './dataQuality';
// Note: rateProvider is NOT re-exported here to avoid duplicate type exports.
// Import directly from '@/lib/arbitrage/rateProvider' when needed.
export { fetchRiskFreeRate, buildDividendData, buildZeroDividend } from './rateProvider';
export type { DividendInput } from './rateProvider';
