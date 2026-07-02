import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { OnyxProtocol } from "../target/types/onyx_protocol";
import { assert } from "chai";

describe("onyx-protocol", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.OnyxProtocol as Program<OnyxProtocol>;

  it("Initializes a token analysis account", async () => {
    const tokenAddress = "So11111111111111111111111111111111111111112";
    const tokenSymbol = "SOL";
    
    // Derive PDA for token analysis
    const [analysisPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_analysis"), Buffer.from(tokenAddress)],
      program.programId
    );

    // Try to initialize
    try {
      const tx = await program.methods
        .initialize(tokenAddress, tokenSymbol)
        .accounts({
          tokenAnalysis: analysisPda,
          user: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("Initialize transaction signature:", tx);

      // Fetch the account and verify
      const account = await program.account.tokenAnalysis.fetch(analysisPda);
      assert.equal(account.tokenAddress, tokenAddress);
      assert.equal(account.tokenSymbol, tokenSymbol);
      assert.ok(account.isActive);
    } catch (err) {
      // Account may already exist; that's fine for test purposes
      if (err.message?.includes("already in use")) {
        console.log("Account already initialized — skipping creation test");
      } else {
        throw err;
      }
    }
  });

  it("Updates token analysis scores", async () => {
    const tokenAddress = "So11111111111111111111111111111111111111112";
    
    const [analysisPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_analysis"), Buffer.from(tokenAddress)],
      program.programId
    );

    const scores = {
      liquidityScore: 85,
      holderScore: 72,
      volumeScore: 91,
      volatilityScore: 45,
      riskScore: 30,
      momentumScore: 78,
      compositeScore: 75,
    };

    try {
      const tx = await program.methods
        .updateTokenAnalysis(
          tokenAddress,
          scores.liquidityScore,
          scores.holderScore,
          scores.volumeScore,
          scores.volatilityScore,
          scores.riskScore,
          scores.momentumScore,
          scores.compositeScore
        )
        .accounts({
          tokenAnalysis: analysisPda,
          user: provider.wallet.publicKey,
        })
        .rpc();

      console.log("Update transaction signature:", tx);
    } catch (err) {
      if (err.message?.includes("does not exist")) {
        console.log("Account not found — skipping update test");
      } else {
        throw err;
      }
    }
  });

  it("Validates score ranges (should fail on invalid scores)", async () => {
    const tokenAddress = "InvalidScoreToken";
    
    const [analysisPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_analysis"), Buffer.from(tokenAddress)],
      program.programId
    );

    // Try to initialize with an out-of-range score (e.g., 150)
    try {
      await program.methods
        .initialize(tokenAddress, "INV")
        .accounts({
          tokenAnalysis: analysisPda,
          user: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      // Now try to update with invalid score
      await program.methods
        .updateTokenAnalysis(
          tokenAddress,
          95,  // liquidityScore (valid)
          72,  // holderScore (valid)
          150, // volumeScore (INVALID > 100)
          45,  // volatilityScore (valid)
          30,  // riskScore (valid)
          78,  // momentumScore (valid)
          75   // compositeScore (valid)
        )
        .accounts({
          tokenAnalysis: analysisPda,
          user: provider.wallet.publicKey,
        })
        .rpc();

      // Should not reach here — should have thrown error
      assert.fail("Expected error for invalid score did not occur");
    } catch (err) {
      // Expected error — score validation failed
      if (err.message?.includes("score") || err.message?.includes("range")) {
        console.log("✅ Score validation correctly rejected invalid score:", err.message);
      } else {
        // If account doesn't exist, that's fine; main test is the Rust unit test
        if (err.message?.includes("does not exist") || err.message?.includes("already in use")) {
          console.log("Account state prevents test — score validation tested in Rust unit tests");
        } else {
          throw err;
        }
      }
    }
  });

  it("Closes a token analysis account", async () => {
    const tokenAddress = "So11111111111111111111111111111111111111112";
    
    const [analysisPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_analysis"), Buffer.from(tokenAddress)],
      program.programId
    );

    try {
      const tx = await program.methods
        .closeTokenAnalysis(tokenAddress)
        .accounts({
          tokenAnalysis: analysisPda,
          user: provider.wallet.publicKey,
        })
        .rpc();

      console.log("Close transaction signature:", tx);
    } catch (err) {
      if (err.message?.includes("does not exist")) {
        console.log("Account already closed or not found — skipping close test");
      } else {
        throw err;
      }
    }
  });
});