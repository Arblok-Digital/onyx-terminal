use anchor_lang::prelude::*;

use crate::state::*;
use crate::constants::*;
use crate::error::ErrorCode;

/// Data payload for updating token analysis
/// All score fields are basis points (0-10000 where 10000 = 100%)
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateTokenAnalysisParams {
    // Whale Activity
    pub large_transfers: u64,
    pub whale_wallets: u64,
    pub holder_concentration: u64,     // basis points

    // Holder Growth
    pub new_holders: u64,
    pub holder_growth_rate: i64,       // basis points

    // Developer Activity
    pub dev_tx_count: u64,
    pub suspicious_transfers: u64,
    pub dev_wallet_balance: u64,

    // Liquidity
    pub liquidity_depth: u64,
    pub liquidity_change_24h: i64,     // basis points
    pub locked_liquidity: u64,
    pub liquidity_concentration: u64,  // basis points

    // RugPull Scores (0-10000)
    pub dump_score: u64,
    pub liquidity_removal_score: u64,
    pub dev_activity_score: u64,
    pub overall_rug_score: u64,

    // Risk Score (0-10000)
    pub risk_score: u64,

    // Contract Info
    pub mint_authority: bool,
    pub freeze_authority: bool,
    pub is_verified: bool,
    pub renounced: bool,
    pub token_age_seconds: i64,
}

#[derive(Accounts)]
pub struct UpdateTokenAnalysis<'info> {
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
    )]
    pub token_analysis: Account<'info, TokenAnalysis>,
}

pub fn handler(ctx: Context<UpdateTokenAnalysis>, params: UpdateTokenAnalysisParams) -> Result<()> {
    let analysis = &mut ctx.accounts.token_analysis;

    // Validate score ranges (0-10000 for basis-point fields)
    require!(params.holder_concentration <= 10000, ErrorCode::InvalidScore);
    require!(params.liquidity_concentration <= 10000, ErrorCode::InvalidScore);
    require!(params.dump_score <= 10000, ErrorCode::InvalidScore);
    require!(params.liquidity_removal_score <= 10000, ErrorCode::InvalidScore);
    require!(params.dev_activity_score <= 10000, ErrorCode::InvalidScore);
    require!(params.overall_rug_score <= 10000, ErrorCode::InvalidScore);
    require!(params.risk_score <= 10000, ErrorCode::InvalidScore);

    // Whale Activity
    analysis.large_transfers = params.large_transfers;
    analysis.whale_wallets = params.whale_wallets;
    analysis.holder_concentration = params.holder_concentration;

    // Holder Growth
    analysis.new_holders = params.new_holders;
    analysis.holder_growth_rate = params.holder_growth_rate;

    // Developer Activity
    analysis.dev_tx_count = params.dev_tx_count;
    analysis.suspicious_transfers = params.suspicious_transfers;
    analysis.dev_wallet_balance = params.dev_wallet_balance;

    // Liquidity
    analysis.liquidity_depth = params.liquidity_depth;
    analysis.liquidity_change_24h = params.liquidity_change_24h;
    analysis.locked_liquidity = params.locked_liquidity;
    analysis.liquidity_concentration = params.liquidity_concentration;

    // RugPull Scores
    analysis.dump_score = params.dump_score;
    analysis.liquidity_removal_score = params.liquidity_removal_score;
    analysis.dev_activity_score = params.dev_activity_score;
    analysis.overall_rug_score = params.overall_rug_score;

    // Risk
    analysis.risk_score = params.risk_score;

    // Contract
    analysis.mint_authority = params.mint_authority;
    analysis.freeze_authority = params.freeze_authority;
    analysis.is_verified = params.is_verified;
    analysis.renounced = params.renounced;
    analysis.token_age_seconds = params.token_age_seconds;

    // Update timestamp
    analysis.analysis_timestamp = Clock::get()?.unix_timestamp;

    emit!(TokenAnalysisUpdated {
        mint: analysis.mint,
        timestamp: analysis.analysis_timestamp,
        overall_rug_score: analysis.overall_rug_score,
        risk_score: analysis.risk_score,
    });

    Ok(())
}

#[event]
pub struct TokenAnalysisUpdated {
    pub mint: Pubkey,
    pub timestamp: i64,
    pub overall_rug_score: u64,
    pub risk_score: u64,
}