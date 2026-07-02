use anchor_lang::prelude::*;

/// Global configuration for Onyx Protocol
#[account]
#[derive(InitSpace)]
pub struct OnyxConfig {
    pub authority: Pubkey,          // Admin authority
    pub fee_wallet: Pubkey,         // Fee collection wallet
    pub paused: bool,               // Emergency pause
    pub analysis_count: u64,        // Total analyses created
    pub bump: u8,
}

/// Per-token on-chain analysis storage
/// Stores computed intelligence data that AI agents write & read
#[account]
#[derive(InitSpace)]
pub struct TokenAnalysis {
    pub mint: Pubkey,               // Token mint address
    pub authority: Pubkey,          // Who created this analysis
    
    // === Whale Activity ===
    pub large_transfers: u64,       // Number of large transfers detected
    pub whale_wallets: u64,         // Number of whale wallets
    pub holder_concentration: u64,  // Top 10 holder concentration (basis points, e.g. 5000 = 50%)
    
    // === Holder Growth ===
    pub new_holders: u64,           // New holders in period
    pub holder_growth_rate: i64,    // Growth rate (basis points, can be negative)
    
    // === Developer Activity ===
    pub dev_tx_count: u64,          // Dev wallet transaction count
    pub suspicious_transfers: u64,  // Suspicious transfer count
    pub dev_wallet_balance: u64,    // Dev wallet balance (lamports)
    
    // === Liquidity Analysis ===
    pub liquidity_depth: u64,       // Liquidity depth (USD cents)
    pub liquidity_change_24h: i64,  // 24h change (basis points)
    pub locked_liquidity: u64,      // Locked liquidity (USD cents)
    pub liquidity_concentration: u64, // LP concentration (basis points)
    
    // === RugPull Indicators ===
    pub dump_score: u64,            // 0-10000 (0.00% - 100.00%)
    pub liquidity_removal_score: u64,
    pub dev_activity_score: u64,
    pub overall_rug_score: u64,
    
    // === Risk ===
    pub risk_score: u64,            // 0-10000
    
    // === Contract Analysis ===
    pub mint_authority: bool,
    pub freeze_authority: bool,
    pub is_verified: bool,
    pub renounced: bool,
    pub token_age_seconds: i64,     // Age in seconds
    
    // === Metadata ===
    pub analysis_timestamp: i64,    // When this analysis was created/updated
    pub bump: u8,
}