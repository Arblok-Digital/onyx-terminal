use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Not authorized to perform this action")]
    Unauthorized,
    
    #[msg("Protocol is paused")]
    ProtocolPaused,
    
    #[msg("Token analysis account already exists")]
    AlreadyInitialized,
    
    #[msg("Token analysis account not found")]
    NotFound,
    
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    
    #[msg("Invalid input data")]
    InvalidInput,
    
    #[msg("Score out of valid range (0-10000)")]
    InvalidScore,
    
    #[msg("Analysis account is too old to update - reinitialize")]
    StaleAnalysis,
}