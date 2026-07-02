/**
 * @file useOnyxProgram.ts
 * @layer hooks
 * @desc React hook providing the OnyxProgramClient singleton, connected to wallet.
 *       Every component that needs on-chain data uses this hook.
 * @exposes useOnyxProgram
 * @deps @solana/wallet-adapter-react, @solana/web3.js
 */

import { useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { OnyxProgramClient } from '../lib/onyxProgram';
import { ONYX_PROGRAM_ID, getConfigPDA, getAnalysisPDA } from '../lib/idl/onyx_protocol';

interface UseOnyxProgramReturn {
  /** The program client — ready to use if connection is available */
  program: OnyxProgramClient | null;
  /** Connected wallet public key */
  walletPubkey: PublicKey | null;
  /** Whether wallet is connected */
  connected: boolean;
  /** Whether the RPC connection is ready */
  ready: boolean;
  /** Convenience PDA resolvers */
  pdas: {
    config: () => { pda: PublicKey; bump: number };
    analysis: (mint: PublicKey) => { pda: PublicKey; bump: number };
  };
}

/**
 * useOnyxProgram — main hook for on-chain interactions.
 *
 * Usage:
 *   const { program, connected } = useOnyxProgram();
 *   const config = await program?.getConfig();
 */
export function useOnyxProgram(): UseOnyxProgramReturn {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();

  const program = useMemo(() => {
    if (!connection) return null;
    return new OnyxProgramClient(connection, ONYX_PROGRAM_ID);
  }, [connection]);

  return {
    program,
    walletPubkey: publicKey ?? null,
    connected,
    ready: program !== null && connected,
    pdas: {
      config: () => getConfigPDA(ONYX_PROGRAM_ID),
      analysis: (mint: PublicKey) => getAnalysisPDA(mint, ONYX_PROGRAM_ID),
    },
  };
}