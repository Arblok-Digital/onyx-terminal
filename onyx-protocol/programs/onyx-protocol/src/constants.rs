use anchor_lang::prelude::*;

#[constant]
pub const SEED: &str = "anchor";

// PDA seeds for onyx-protocol accounts
pub const ONYX_CONFIG_SEED: &[u8] = b"onyx_config";
pub const TOKEN_ANALYSIS_SEED: &[u8] = b"token_analysis";

// Size constraints
pub const MAX_DESCRIPTION_LEN: usize = 200;
pub const MAX_AUTHORITIES: usize = 10;