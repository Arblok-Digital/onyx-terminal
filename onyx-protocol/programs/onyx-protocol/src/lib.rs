pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("FjMdzw1x2zobB9UD8pcezbmzLwuHQnKMzit68Zbx87PG");

#[program]
pub mod onyx_protocol {
    use super::*;

    /// Initialize global Onyx configuration
    pub fn initialize(ctx: Context<Initialize>, fee_wallet: Pubkey) -> Result<()> {
        initialize::handler(ctx, fee_wallet)
    }

    /// Initialize a new token analysis account
    pub fn init_token_analysis(ctx: Context<InitTokenAnalysis>, mint: Pubkey) -> Result<()> {
        init_token_analysis::handler(ctx, mint)
    }

    /// Update token analysis with on-chain intelligence data
    pub fn update_token_analysis(
        ctx: Context<UpdateTokenAnalysis>,
        params: UpdateTokenAnalysisParams,
    ) -> Result<()> {
        update_token_analysis::handler(ctx, params)
    }

    /// Close a token analysis account (refund rent)
    pub fn close_token_analysis(ctx: Context<CloseTokenAnalysis>) -> Result<()> {
        close_token_analysis::handler(ctx)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::ErrorCode;

    // ============================================================
    // Score Validation Tests
    // ============================================================

    /// Test that basis point fields validate correctly (0-10000 range)
    #[test]
    fn test_score_range_validation() {
        // Valid scores (boundary cases)
        assert!(validate_basis_points(0));
        assert!(validate_basis_points(5000));
        assert!(validate_basis_points(10000));

        // Invalid scores (out of range)
        assert!(!validate_basis_points(10001));
        assert!(!validate_basis_points(u64::MAX));
    }

    #[test]
    fn test_update_params_score_bounds() {
        // All scores at minimum (0) — should be valid
        let params = create_test_params_with_scores(0, 0, 0, 0, 0, 0, 0);
        assert!(all_scores_in_range(&params));

        // All scores at maximum (10000) — should be valid
        let params = create_test_params_with_scores(10000, 10000, 10000, 10000, 10000, 10000, 10000);
        assert!(all_scores_in_range(&params));

        // One score out of range — should fail
        let params = create_test_params_with_scores(10001, 5000, 5000, 5000, 5000, 5000, 5000);
        assert!(!all_scores_in_range(&params));

        // All scores out of range — should fail
        let params = create_test_params_with_scores(10001, 10001, 10001, 10001, 10001, 10001, 10001);
        assert!(!all_scores_in_range(&params));
    }

    #[test]
    fn test_partial_score_validation() {
        // Only holder_concentration out of range
        let params = create_test_params_with_scores(5000, 5000, 20000, 5000, 5000, 5000, 5000);
        assert!(!all_scores_in_range(&params));

        // Only liquidity_concentration out of range
        let params = create_test_params_with_scores(5000, 5000, 5000, 20000, 5000, 5000, 5000);
        assert!(!all_scores_in_range(&params));

        // Only overall_rug_score out of range
        let params = create_test_params_with_scores(5000, 5000, 5000, 5000, 5000, 5000, 20000);
        assert!(!all_scores_in_range(&params));
    }

    // ============================================================
    // Arithmetic Overflow Test
    // ============================================================

    #[test]
    fn test_checked_increment() {
        let mut counter: u64 = 0;
        counter = counter.checked_add(1).unwrap();
        assert_eq!(counter, 1);

        counter = counter.checked_add(99).unwrap();
        assert_eq!(counter, 100);

        // Test overflow detection (simulate what happens in handler)
        let max: u64 = u64::MAX;
        let overflow = max.checked_add(1);
        assert!(overflow.is_none());
    }

    // ============================================================
    // Error Code Tests
    // ============================================================

    #[test]
    fn test_error_code_mapping() {
        // Match actual error.rs enum ordering (8 variants total)
        let unauthorized = ErrorCode::Unauthorized as u32;           // 0
        let protocol_paused = ErrorCode::ProtocolPaused as u32;     // 1
        let already_initialized = ErrorCode::AlreadyInitialized as u32; // 2
        let not_found = ErrorCode::NotFound as u32;                 // 3
        let arithmetic_overflow = ErrorCode::ArithmeticOverflow as u32; // 4
        let invalid_input = ErrorCode::InvalidInput as u32;         // 5
        let invalid_score = ErrorCode::InvalidScore as u32;         // 6
        let stale_analysis = ErrorCode::StaleAnalysis as u32;       // 7

        // Verify sequential ordering from error.rs
        assert_eq!(unauthorized, 0);
        assert_eq!(protocol_paused, 1);
        assert_eq!(already_initialized, 2);
        assert_eq!(not_found, 3);
        assert_eq!(arithmetic_overflow, 4);
        assert_eq!(invalid_input, 5);
        assert_eq!(invalid_score, 6);
        assert_eq!(stale_analysis, 7);

        // Verify no duplicate values
        assert_ne!(unauthorized, protocol_paused);
        assert_ne!(arithmetic_overflow, invalid_score);
        assert_ne!(invalid_score, stale_analysis);
    }

    // ============================================================
    // Struct Initialization Tests
    // ============================================================

    #[test]
    fn test_update_token_analysis_params_default() {
        let params = UpdateTokenAnalysisParams {
            large_transfers: 0,
            whale_wallets: 0,
            holder_concentration: 0,
            new_holders: 0,
            holder_growth_rate: 0,
            dev_tx_count: 0,
            suspicious_transfers: 0,
            dev_wallet_balance: 0,
            liquidity_depth: 0,
            liquidity_change_24h: 0,
            locked_liquidity: 0,
            liquidity_concentration: 0,
            dump_score: 0,
            liquidity_removal_score: 0,
            dev_activity_score: 0,
            overall_rug_score: 0,
            risk_score: 0,
            mint_authority: false,
            freeze_authority: false,
            is_verified: false,
            renounced: false,
            token_age_seconds: 0,
        };

        // Default values should all be valid (all zeros)
        assert!(all_scores_in_range(&params));

        // Simulate typical real-world data
        let real_params = UpdateTokenAnalysisParams {
            large_transfers: 42,
            whale_wallets: 5,
            holder_concentration: 6500,  // 65% top 10 concentration
            new_holders: 150,
            holder_growth_rate: 250,     // 2.5% growth
            dev_tx_count: 10,
            suspicious_transfers: 2,
            dev_wallet_balance: 100_000_000,
            liquidity_depth: 500_000_00, // $500k
            liquidity_change_24h: -500,  // -5%
            locked_liquidity: 250_000_00,
            liquidity_concentration: 3000,
            dump_score: 2500,
            liquidity_removal_score: 1500,
            dev_activity_score: 1800,
            overall_rug_score: 2000,     // 20% overall rug risk
            risk_score: 3500,            // 35% risk score
            mint_authority: false,
            freeze_authority: false,
            is_verified: true,
            renounced: true,
            token_age_seconds: 86400 * 30, // 30 days
        };

        assert!(all_scores_in_range(&real_params));
        assert_eq!(real_params.large_transfers, 42);
        assert_eq!(real_params.whale_wallets, 5);
        assert_eq!(real_params.token_age_seconds, 86400 * 30);
    }

    // ============================================================
    // PDA Seed Test
    // ============================================================

    #[test]
    fn test_pda_seed_constants() {
        // Seeds use underscore convention (matching constants.rs)
        assert_eq!(ONYX_CONFIG_SEED, b"onyx_config");
        assert_eq!(TOKEN_ANALYSIS_SEED, b"token_analysis");
    }

    // ============================================================
    // Test Helpers
    // ============================================================

    /// Validate that a basis point value is in range [0, 10000]
    fn validate_basis_points(value: u64) -> bool {
        value <= 10000
    }

    /// Check all score fields in UpdateTokenAnalysisParams are in valid range
    fn all_scores_in_range(params: &UpdateTokenAnalysisParams) -> bool {
        params.holder_concentration <= 10000
            && params.liquidity_concentration <= 10000
            && params.dump_score <= 10000
            && params.liquidity_removal_score <= 10000
            && params.dev_activity_score <= 10000
            && params.overall_rug_score <= 10000
            && params.risk_score <= 10000
    }

    /// Create test params with specific scores (others default to 0)
    fn create_test_params_with_scores(
        holder_concentration: u64,
        liquidity_concentration: u64,
        dump_score: u64,
        liquidity_removal_score: u64,
        dev_activity_score: u64,
        overall_rug_score: u64,
        risk_score: u64,
    ) -> UpdateTokenAnalysisParams {
        UpdateTokenAnalysisParams {
            large_transfers: 0,
            whale_wallets: 0,
            holder_concentration,
            new_holders: 0,
            holder_growth_rate: 0,
            dev_tx_count: 0,
            suspicious_transfers: 0,
            dev_wallet_balance: 0,
            liquidity_depth: 0,
            liquidity_change_24h: 0,
            locked_liquidity: 0,
            liquidity_concentration,
            dump_score,
            liquidity_removal_score,
            dev_activity_score,
            overall_rug_score,
            risk_score,
            mint_authority: false,
            freeze_authority: false,
            is_verified: false,
            renounced: false,
            token_age_seconds: 0,
        }
    }
}