use anchor_lang::prelude::*;

use crate::state::*;
use crate::constants::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
pub struct CloseTokenAnalysis<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [ONYX_CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, OnyxConfig>,

    #[account(
        mut,
        seeds = [TOKEN_ANALYSIS_SEED, token_analysis.mint.as_ref()],
        bump = token_analysis.bump,
        constraint = token_analysis.authority == authority.key() @ ErrorCode::Unauthorized,
        close = authority
    )]
    pub token_analysis: Account<'info, TokenAnalysis>,
}

pub fn handler(_ctx: Context<CloseTokenAnalysis>) -> Result<()> {
    emit!(TokenAnalysisClosed {
        mint: _ctx.accounts.token_analysis.mint,
        timestamp: Clock::get()?.unix_timestamp,
    });
    Ok(())
}

#[event]
pub struct TokenAnalysisClosed {
    pub mint: Pubkey,
    pub timestamp: i64,
}