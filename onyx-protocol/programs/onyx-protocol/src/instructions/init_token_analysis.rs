use anchor_lang::prelude::*;

use crate::state::*;
use crate::constants::*;
use crate::error::ErrorCode;

#[derive(Accounts)]
#[instruction(mint: Pubkey)]
pub struct InitTokenAnalysis<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [ONYX_CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Account<'info, OnyxConfig>,

    #[account(
        init,
        payer = authority,
        space = 8 + TokenAnalysis::INIT_SPACE,
        seeds = [TOKEN_ANALYSIS_SEED, mint.as_ref()],
        bump
    )]
    pub token_analysis: Account<'info, TokenAnalysis>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitTokenAnalysis>, mint: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let analysis = &mut ctx.accounts.token_analysis;

    // Check if paused
    if config.paused {
        return Err(ErrorCode::ProtocolPaused.into());
    }

    // Initialize with default values
    analysis.mint = mint;
    analysis.authority = ctx.accounts.authority.key();
    analysis.bump = ctx.bumps.token_analysis;
    analysis.analysis_timestamp = Clock::get()?.unix_timestamp;

    // Initialize score fields to zero
    analysis.holder_concentration = 0;
    analysis.liquidity_concentration = 0;
    analysis.dump_score = 0;
    analysis.liquidity_removal_score = 0;
    analysis.dev_activity_score = 0;
    analysis.overall_rug_score = 0;
    analysis.risk_score = 0;

    // Increment analysis counter
    config.analysis_count = config.analysis_count
        .checked_add(1)
        .ok_or(ErrorCode::ArithmeticOverflow)?;

    emit!(TokenAnalysisInitialized {
        mint,
        authority: analysis.authority,
        timestamp: analysis.analysis_timestamp,
        analysis_id: config.analysis_count,
    });

    Ok(())
}

#[event]
pub struct TokenAnalysisInitialized {
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
    pub analysis_id: u64,
}