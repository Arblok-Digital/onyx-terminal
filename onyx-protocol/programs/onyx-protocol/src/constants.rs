use anchor_lang::prelude::*;

#[constant]
pub const SEED: &str = "anchor";

// PDA seeds for onyx-protocol accounts
pub const ONYX_CONFIG_SEED: &[u8] = b"onyx_config";
pub const TOKEN_ANALYSIS_SEED: &[u8] = b"token_analysis";

// Score constraints (basis points: 0-10000 = 0.00% - 100.00%)
pub const MIN_SCORE: u64 = 0;
pub const MAX_SCORE: u64 = 10000;

// Size constraints
pub const MAX_DESCRIPTION_LEN: usize = 200;
pub const MAX_AUTHORITIES: usize = 10;

// Time constants
pub const MAX_ANALYSIS_AGE_SECONDS: i64 = 86400 * 7; // 7 days
pub const MIN_UPDATE_INTERVAL_SECONDS: i64 = 3600; // 1 hour
