/**
 * @file swap.config.ts
 * @layer panel
 * @desc Constants for the Jupiter Swap panel: referral account, fee bps,
 *       SOL mint, and the DOM id where the Jupiter Plugin renders.
 * @exposes REFERRAL_ACCOUNT, REFERRAL_FEE_BPS, SOL_MINT, JUP_TARGET_ID,
 *          JUP_SCRIPT_URL
 * @deps -
 */

/** Referral account that collects the platform fee on every swap. */
export const REFERRAL_ACCOUNT = "5wYwgdRCUDPPtXTrAhPWr7GiqaXHzKWaLPDDj7REtV43";

/** Platform fee in basis points (50 bps = 0.50%). */
export const REFERRAL_FEE_BPS = 50;

/** Wrapped SOL mint — default input token for swap. */
export const SOL_MINT = "So11111111111111111111111111111111111111112";

/** DOM id Jupiter Plugin renders into. Must be unique on the page. */
export const JUP_TARGET_ID = "onyx-jup-swap-target";

/** Official Jupiter Plugin script (latest v1). */
export const JUP_SCRIPT_URL = "https://plugin.jup.ag/plugin-v1.js";
