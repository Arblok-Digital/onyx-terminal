use anchor_lang::prelude::*;

use crate::state::*;
use crate::constants::ONYX_CONFIG_SEED;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + OnyxConfig::INIT_SPACE,
        seeds = [ONYX_CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, OnyxConfig>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>, fee_wallet: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.config;
    
    config.authority = ctx.accounts.authority.key();
    config.fee_wallet = fee_wallet;
    config.paused = false;
    config.analysis_count = 0;
    config.bump = ctx.bumps.config;

    emit!(ConfigInitialized {
        authority: config.authority,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[event]
pub struct ConfigInitialized {
    pub authority: Pubkey,
    pub timestamp: i64,
}