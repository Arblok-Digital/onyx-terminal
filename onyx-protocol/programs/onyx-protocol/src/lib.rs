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