/**
 * @file councilAnalyzer.ts
 * @layer core
 * @desc Council Ringan — ECC-style lightweight council pattern.
 *       3 simulated voices evaluating token analysis data:
 *         - Architect: Best practice, long-term perspective
 *         - Skeptic: Critical, find weaknesses & risks
 *         - Strategist: Synthesis, verdict, next steps
 *
 *       Sits between Phase 2 (data collection) and Phase 3 (ranking/report).
 *       Each voice produces a structured assessment of the complete data set.
 *       The Strategist synthesizes all 3 voices into a final council verdict.
 *
 * @exposes runCouncilAnalysis, type CouncilVerdict, type CouncilVoice
 */

import type {
  FlowAnalysis,
  OnchainAnalysis,
  MarketAnalysis,
  EarlyOpportunityAnalysis,
  NarrativeAnalysis,
  SmartMoneyAnalysis,
  SurvivalAnalysis,
} from '../types/analysisTypes';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface CouncilVoiceOutput {
  role: 'architect' | 'skeptic' | 'strategist';
  score: number; // 0-100
  confidence: number; // 0-100
  findings: string[];
  warnings: string[];
  reasoning: string;
}

export interface CouncilVerdict {
  architect: CouncilVoiceOutput;
  skeptic: CouncilVoiceOutput;
  strategist: CouncilVoiceOutput;
  consensusScore: number; // Weighted average of all 3 voices
  consensusRating: 'AVOID' | 'CAUTION' | 'MONITOR' | 'WATCH' | 'POTENTIAL' | 'OPPORTUNITY' | 'STRONG OPPORTUNITY';
  keyTensions: string[]; // Points where Architect & Skeptic disagree
  finalVerdict: string;
}

/* ------------------------------------------------------------------ */
/* Council Voice: Architect                                            */
/* ------------------------------------------------------------------ */

function architectVoice(
  onchain: OnchainAnalysis,
  market: MarketAnalysis,
  narrative: NarrativeAnalysis,
  survival: SurvivalAnalysis,
  opportunity: EarlyOpportunityAnalysis,
): CouncilVoiceOutput {
  const findings: string[] = [];
  const warnings: string[] = [];

  // --- 1. Contract & Token Structure (long-term health) ---
  let structureScore = 50;
  const contract = onchain.contractAnalysis;
  if (contract) {
    if (contract.isVerified) {
      findings.push('✅ Contract is verified on-chain — good transparency practice.');
      structureScore += 10;
    }
    if (!contract.mintAuthority) {
      findings.push('✅ Mint authority renounced — supply cannot be inflated.');
      structureScore += 10;
    } else {
      warnings.push('⚠️ Mint authority still active — developer can mint at will.');
      structureScore -= 10;
    }
    if (!contract.freezeAuthority) {
      findings.push('✅ Freeze authority renounced — accounts cannot be frozen.');
      structureScore += 5;
    }
    if (contract.renounced) {
      findings.push('✅ Contract ownership renounced — long-term stability signal.');
      structureScore += 10;
    }
    if (contract.age > 30) {
      findings.push(`✅ Token aged ${contract.age} days — survived early volatility.`);
      structureScore += 5;
    } else if (contract.age < 7) {
      warnings.push(`⚠️ Token only ${contract.age} days old — very early stage, higher risk.`);
      structureScore -= 5;
    }
  }
  structureScore = Math.max(0, Math.min(100, structureScore));

  // --- 2. Holder Distribution (decentralization) ---
  let holderScore = 50;
  const whale = onchain.whaleActivity;
  if (whale) {
    if (whale.concentration > 0.5) {
      warnings.push(`⚠️ Top holders control ${(whale.concentration * 100).toFixed(0)}% of supply — centralized.`);
      holderScore -= 15;
    } else if (whale.concentration < 0.2) {
      findings.push('✅ Healthy holder distribution — low concentration.');
      holderScore += 10;
    }
    if (whale.whaleWallets > 5) {
      findings.push(`✅ ${whale.whaleWallets} distinct whale wallets — distributed interest.`);
      holderScore += 5;
    }
  }
  const growth = onchain.holderGrowth;
  if (growth && growth.growthRate > 0.1) {
    findings.push(`✅ Organic holder growth at ${(growth.growthRate * 100).toFixed(1)}% — growing community.`);
    holderScore += 10;
  }
  holderScore = Math.max(0, Math.min(100, holderScore));

  // --- 3. Liquidity Quality (trading infrastructure) ---
  let liquidityScore = 50;
  const liq = onchain.liquidityAnalysis;
  if (liq) {
    if (liq.lockedLiquidity > 0) {
      findings.push(`✅ ${liq.lockedLiquidity > 50000 ? 'Substantial' : 'Some'} liquidity locked — reduces rug risk.`);
      liquidityScore += 15;
    } else {
      warnings.push('⚠️ No locked liquidity detected — high exit scam risk.');
      liquidityScore -= 20;
    }
    if (liq.liquidityDepth > 50000) {
      findings.push('✅ Deep liquidity pool — supports decent trade sizes.');
      liquidityScore += 10;
    } else if (liq.liquidityDepth < 5000) {
      warnings.push('⚠️ Shallow liquidity — large trades will cause high slippage.');
      liquidityScore -= 10;
    }
  }
  liquidityScore = Math.max(0, Math.min(100, liquidityScore));

  // --- 4. Narrative Sustainability ---
  let narrativeScore = 50;
  if (narrative.narrativeStrength && narrative.narrativeStrength > 60) {
    findings.push(`✅ Strong narrative strength (${narrative.narrativeStrength}/100) — sustainable interest.`);
    narrativeScore += 10;
  } else if (narrative.narrativeStrength && narrative.narrativeStrength < 30) {
    warnings.push('⚠️ Weak narrative — limited long-term attention potential.');
    narrativeScore -= 10;
  }
  if (narrative.influencerActivity && narrative.influencerActivity.totalInfluencers > 3) {
    findings.push(`✅ ${narrative.influencerActivity.totalInfluencers} influencers discussing — social proof.`);
    narrativeScore += 5;
  }
  narrativeScore = Math.max(0, Math.min(100, narrativeScore));

  // --- 5. Survival & Longevity ---
  let survivalScore = 50;
  if (survival.survivalProbability) {
    const pct = survival.survivalProbability * 100;
    if (pct > 60) {
      findings.push(`✅ ${pct.toFixed(0)}% survival probability — structurally sound.`);
      survivalScore += 15;
    } else if (pct < 30) {
      warnings.push(`⚠️ Only ${pct.toFixed(0)}% survival probability — fragile tokenomics.`);
      survivalScore -= 15;
    }
  }
  survivalScore = Math.max(0, Math.min(100, survivalScore));

  // --- Composite Score ---
  const overall = Math.round(
    structureScore * 0.3 +
    holderScore * 0.2 +
    liquidityScore * 0.25 +
    narrativeScore * 0.1 +
    survivalScore * 0.15,
  );

  const reasoning = `Architect assessment: Structure ${structureScore}/100, Holders ${holderScore}/100, ` +
    `Liquidity ${liquidityScore}/100, Narrative ${narrativeScore}/100, Survival ${survivalScore}/100. ` +
    `Weighted composite: ${overall}/100.`;

  return {
    role: 'architect',
    score: overall,
    confidence: 75 + (contract?.isVerified ? 10 : 0) + (liq?.lockedLiquidity ? 5 : 0),
    findings,
    warnings,
    reasoning,
  };
}

/* ------------------------------------------------------------------ */
/* Council Voice: Skeptic                                              */
/* ------------------------------------------------------------------ */

function skepticVoice(
  onchain: OnchainAnalysis,
  flow: FlowAnalysis,
  smartMoney: SmartMoneyAnalysis,
  market: MarketAnalysis,
  opportunity: EarlyOpportunityAnalysis,
): CouncilVoiceOutput {
  const findings: string[] = [];
  const warnings: string[] = [];

  // --- 1. Rug Pull Indicators (critical red flags) ---
  let rugScore = 50;
  const rug = onchain.rugPullIndicators;
  if (rug) {
    if (rug.overallRugScore > 0.6) {
      warnings.push(`🚨 CRITICAL: Overall rug score ${(rug.overallRugScore * 100).toFixed(0)}/100 — extremely high risk.`);
      rugScore -= 25;
    } else if (rug.overallRugScore > 0.3) {
      warnings.push(`⚠️ Elevated rug score ${(rug.overallRugScore * 100).toFixed(0)}/100 — proceed with caution.`);
      rugScore -= 10;
    } else {
      findings.push('✅ Low rug pull indicators — contract appears safe.');
      rugScore += 10;
    }
    if (rug.dumpScore > 0.5) {
      warnings.push('⚠️ High dump score — early holders / dev may be positioned to sell.');
      rugScore -= 10;
    }
    if (rug.devWalletActivityScore > 0.5) {
      warnings.push('🚨 Suspicious dev wallet activity — potential insider manipulation.');
      rugScore -= 15;
    }
    if (rug.liquidityRemovalScore > 0.5) {
      warnings.push('🚨 High liquidity removal risk — dev may pull liquidity.');
      rugScore -= 15;
    }
  }
  rugScore = Math.max(0, Math.min(100, rugScore));

  // --- 2. Anomalous Flow Patterns (wash trading, manipulation) ---
  let flowScore = 50;
  if (flow.anomalousTransactions && flow.anomalousTransactions.length > 0) {
    warnings.push(`⚠️ ${flow.anomalousTransactions.length} anomalous transactions detected — possible manipulation.`);
    flowScore -= 15;
  }
  if (flow.exchangeFlow) {
    const netExchange = flow.exchangeFlow.netExchangeFlow;
    if (netExchange > 10) {
      warnings.push(`⚠️ Heavy inflow to exchanges (${netExchange} tx) — potential sell pressure.`);
      flowScore -= 10;
    } else if (netExchange < -10) {
      findings.push('✅ Tokens moving out of exchanges — accumulation pattern.');
      flowScore += 10;
    }
  }
  flowScore = Math.max(0, Math.min(100, flowScore));

  // --- 3. Smart Money Skepticism ---
  let smartScore = 50;
  if (smartMoney.smartMoneyPercentage !== undefined) {
    if (smartMoney.smartMoneyPercentage < 5) {
      warnings.push('⚠️ Very low smart money involvement (<5%) — lacks institutional interest.');
      smartScore -= 15;
    } else if (smartMoney.smartMoneyPercentage > 30) {
      findings.push(`✅ ${smartMoney.smartMoneyPercentage}% smart money — significant sophisticated capital.`);
      smartScore += 10;
    }
  }
  if (smartMoney.trackedWallets && smartMoney.trackedWallets.length === 0) {
    warnings.push('⚠️ No tracked smart wallets detected — retail-dominated volume.');
    smartScore -= 10;
  }
  if (smartMoney.accumulationPattern && smartMoney.accumulationPattern.isAccumulating === false) {
    warnings.push('⚠️ Smart money NOT accumulating — may be distributing instead.');
    smartScore -= 10;
  }
  smartScore = Math.max(0, Math.min(100, smartScore));

  // --- 4. Volume & Price Manipulation ---
  let marketScore = 50;
  if (market.volumeAnalysis) {
    if (market.volumeAnalysis.suspiciousVolume && market.volumeAnalysis.suspiciousVolume > 0.3) {
      warnings.push(`⚠️ ${(market.volumeAnalysis.suspiciousVolume * 100).toFixed(0)}% volume flagged suspicious — wash trading possible.`);
      marketScore -= 15;
    }
    if (market.volumeAnalysis.volume24h && market.volumeAnalysis.volume24h < 1000) {
      warnings.push('⚠️ Extremely low 24h volume (<$1k) — illiquid, hard to trade.');
      marketScore -= 10;
    }
  }
  if (market.volatilityScore !== undefined) {
    if (market.volatilityScore > 0.7) {
      warnings.push('⚠️ Extreme volatility — high chance of manipulation by large holders.');
      marketScore -= 10;
    }
  }
  marketScore = Math.max(0, Math.min(100, marketScore));

  // --- 5. Opportunity Overhype Check ---
  let oppScore = 50;
  if (opportunity.eoiScore) {
    // Skeptic checks: high EOI with low liquidity = potential trap
    const liqDepth = onchain.liquidityAnalysis?.liquidityDepth ?? 0;
    if (opportunity.eoiScore > 70 && liqDepth < 10000) {
      warnings.push('⚠️ High EOI score but shallow liquidity — potential honeypot or low-liq trap.');
      oppScore -= 15;
    }
  }
  oppScore = Math.max(0, Math.min(100, oppScore));

  // --- Composite Score ---
  // Skeptic score is INVERTED — higher = less risky (fewer red flags found)
  const overall = Math.round(
    rugScore * 0.35 +
    flowScore * 0.2 +
    smartScore * 0.2 +
    marketScore * 0.15 +
    oppScore * 0.1,
  );

  const reasoning = `Skeptic audit: Rug ${rugScore}/100, Flow ${flowScore}/100, ` +
    `SmartMoney ${smartScore}/100, Market ${marketScore}/100, OpportunityCheck ${oppScore}/100. ` +
    `Composite safety score: ${overall}/100.`;

  return {
    role: 'skeptic',
    score: overall,
    confidence: 80,
    findings,
    warnings,
    reasoning,
  };
}

/* ------------------------------------------------------------------ */
/* Council Voice: Strategist                                           */
/* ------------------------------------------------------------------ */

function strategistVerdict(
  architect: CouncilVoiceOutput,
  skeptic: CouncilVoiceOutput,
  onchain: OnchainAnalysis,
  opportunity: EarlyOpportunityAnalysis,
  survival: SurvivalAnalysis,
): CouncilVoiceOutput {
  const findings: string[] = [];
  const warnings: string[] = [];
  const tensions: string[] = [];

  // --- Identify Tensions Between Architect & Skeptic ---
  if (architect.score >= 60 && skeptic.score < 40) {
    tensions.push('Architect sees structural strength, but Skeptic finds critical red flags.');
    findings.push('⚡ DIVERGENCE: Strong structure vs high risk flags — requires deeper due diligence.');
  } else if (architect.score < 40 && skeptic.score >= 60) {
    tensions.push('Skeptic approves safety, but Architect finds structural weaknesses.');
    findings.push('⚡ DIVERGENCE: Safe from manipulation, but tokenomics need improvement.');
  }

  // --- Composite Score (weighted: Strategist gives more weight to Skeptic on risk, Architect on quality) ---
  const riskWeight = skeptic.score < 40 ? 0.6 : 0.4; // More weight to skeptic when risks found
  const weightedScore = Math.round(
    architect.score * (1 - riskWeight) +
    skeptic.score * riskWeight,
  );

  // --- Check for Critical Showstoppers ---
  let showstoppers = 0;
  const rugHigh = (onchain.rugPullIndicators?.overallRugScore ?? 0) * 100; // normalize 0-1 → 0-100
  if (rugHigh > 70) {
    warnings.push('🚨 SHOWSTOPPER: Extreme rug pull risk — STRONGLY consider avoiding.');
    showstoppers++;
  }
  const mintActive = onchain.contractAnalysis?.mintAuthority ?? false;
  if (mintActive) {
    warnings.push('🚨 SHOWSTOPPER: Active mint authority — unlimited token supply risk.');
    showstoppers++;
  }
  const noLiqLock = (onchain.liquidityAnalysis?.lockedLiquidity ?? 0) === 0;
  if (noLiqLock) {
    warnings.push('🚨 SHOWSTOPPER: No locked liquidity — exit scam risk.');
    showstoppers++;
  }

  // --- Final Verdict ---
  const finalScore = showstoppers > 0
    ? Math.min(weightedScore, 30) // Cap at 30 if showstoppers exist
    : weightedScore;

  let verdict: string;
  if (showstoppers >= 2) {
    verdict = `AVOID: ${showstoppers} critical showstoppers detected. Risk-reward is severely unfavorable.`;
  } else if (showstoppers === 1) {
    verdict = `CAUTION: 1 critical risk found. Only consider with strict risk management and small position.`;
  } else if (finalScore >= 70) {
    verdict = `STRONG OPPORTUNITY: Council consensus is positive. Architect (${architect.score}) and Skeptic (${skeptic.score}) both confirm quality. ${getEntryAdvice(opportunity)}`;
  } else if (finalScore >= 55) {
    verdict = `POTENTIAL: Council leans positive but with reservations. Skeptic score of ${skeptic.score}/100 suggests caution. ${getEntryAdvice(opportunity)}`;
  } else if (finalScore >= 40) {
    verdict = `MONITOR: Mixed signals. Architect (${architect.score}) sees some merit, but Skeptic (${skeptic.score}) flags concerns. Wait for clearer signals.`;
  } else {
    verdict = `AVOID: Council consensus negative. Architect: ${architect.score}/100, Skeptic: ${skeptic.score}/100. Risks outweigh potential rewards.`;
  }

  // --- Survival Context ---
  if (survival.survivalProbability && survival.survivalProbability < 0.3) {
    warnings.push(`⚠️ Low survival probability (${(survival.survivalProbability * 100).toFixed(0)}%) — token may not last.`);
  }

  findings.push(`Council breakdown: Architect ${architect.score}/100 | Skeptic ${skeptic.score}/100 | Consensus ${finalScore}/100`);
  if (tensions.length > 0) {
    findings.push(...tensions);
  }

  const reasoning = `Strategist synthesis: Architect scored ${architect.score}/100 (structural quality), ` +
    `Skeptic scored ${skeptic.score}/100 (risk assessment). ` +
    `Risk weight applied: ${Math.round(riskWeight * 100)}%. ` +
    `Showstoppers: ${showstoppers}. Final consensus: ${finalScore}/100.`;

  return {
    role: 'strategist',
    score: finalScore,
    confidence: Math.round(85 - showstoppers * 10),
    findings,
    warnings,
    reasoning,
  };
}

/* ------------------------------------------------------------------ */
/* Helper: Entry Advice                                                */
/* ------------------------------------------------------------------ */

function getEntryAdvice(opportunity: EarlyOpportunityAnalysis): string {
  if (opportunity.entryStrategy?.entryTiming) {
    return `Suggested timing: ${opportunity.entryStrategy.entryTiming}.`;
  }
  if (opportunity.eoiScore && opportunity.eoiScore > 70) {
    return 'Consider small initial position with DCA strategy.';
  }
  return 'Wait for clearer confirmation signals before entry.';
}

/* ------------------------------------------------------------------ */
/* Main Council Entry Point                                            */
/* ------------------------------------------------------------------ */

/**
 * Run the full council ringan analysis on collected token data.
 * 3 voices evaluate the data, Strategist synthesizes the final verdict.
 */
export function runCouncilAnalysis(
  flow: FlowAnalysis,
  onchain: OnchainAnalysis,
  market: MarketAnalysis,
  narrative: NarrativeAnalysis,
  smartMoney: SmartMoneyAnalysis,
  opportunity: EarlyOpportunityAnalysis,
  survival: SurvivalAnalysis,
): CouncilVerdict {
  // Voice 1: Architect — long-term structural perspective
  const architect = architectVoice(onchain, market, narrative, survival, opportunity);

  // Voice 2: Skeptic — critical risk analysis
  const skeptic = skepticVoice(onchain, flow, smartMoney, market, opportunity);

  // Voice 3: Strategist — synthesis & verdict
  const strategist = strategistVerdict(architect, skeptic, onchain, opportunity, survival);

  // Calculate consensus score (weighted)
  const consensusScore = strategist.score;

  // Determine consensus rating
  let consensusRating: CouncilVerdict['consensusRating'] = 'MONITOR';
  if (consensusScore < 30) consensusRating = 'AVOID';
  else if (consensusScore < 40) consensusRating = 'CAUTION';
  else if (consensusScore < 50) consensusRating = 'MONITOR';
  else if (consensusScore < 60) consensusRating = 'WATCH';
  else if (consensusScore < 70) consensusRating = 'POTENTIAL';
  else if (consensusScore < 80) consensusRating = 'OPPORTUNITY';
  else consensusRating = 'STRONG OPPORTUNITY';

  // Identify key tensions
  const keyTensions: string[] = [];
  if (architect.score >= 60 && skeptic.score < 40) {
    keyTensions.push('Architect rates structure high but Skeptic finds critical risks.');
  } else if (architect.score < 40 && skeptic.score >= 60) {
    keyTensions.push('Architect finds weak structure but Skeptic sees low manipulation risk.');
  }

  // Merge all warnings for final insight
  const finalVerdict = [
    `Council Verdict: ${consensusRating} (${consensusScore}/100)`,
    `Architect: ${architect.score}/100 — ${architect.findings.length > 0 ? architect.findings[0] : 'neutral'}`,
    `Skeptic: ${skeptic.score}/100 — ${skeptic.warnings.length > 0 ? skeptic.warnings[0] : 'no critical flags'}`,
    `Strategist: ${strategist.findings.length > 0 ? strategist.findings[strategist.findings.length - 1] : strategist.reasoning}`,
  ].join(' | ');

  return {
    architect,
    skeptic,
    strategist,
    consensusScore,
    consensusRating,
    keyTensions,
    finalVerdict,
  };
}
