/**
 * Simple test runner for Onyx Terminal AMD Integration
 * Runs the sample analysis using CommonJS
 */

// Import the runSampleAnalysis function directly
const { runSampleAnalysis } = require('./sampleAnalysis');

// Run the sample analysis
runSampleAnalysis().catch(console.error);