/**
 * Test script to verify AMD AI Service works in browser-like environment
 * This simulates how the FloatingChat component calls the analyzeToken function
 */

// Simulate browser environment
const originalImportMeta = global.import.meta;
global.import.meta = {
    env: {
        VITE_AI_GATEWAY_URL: 'http://localhost:20128/v1',
        VITE_AI_GATEWAY_KEY: 'arblok'
    }
};

// Mock fetch for testing
const originalFetch = global.fetch;
global.fetch = async (url, options) => {
    console.log('📡 Mock fetch called:', url);
    console.log('🔑 Headers:', options.headers);
    console.log('📦 Body:', JSON.parse(options.body));

    // Simulate successful response
    return {
        ok: true,
        json: async () => ({
            choices: [{
                message: {
                    reasoning_content: "This is a test reasoning content from 9Router using the 'arblok' combo.",
                    content: ""
                }
            }],
            model: "deepseek-v4-flash-free"
        }),
        text: async () => "Mock response text"
    };
};

async function testBrowserAICall() {
    console.log('🧪 Testing AMD AI Service in browser-like environment...');

    try {
        // Import the analyzeToken function
        const { analyzeToken } = await import('./amd_integration/index.js');

        console.log('✅ analyzeToken function imported successfully');

        // Test with a mock token address
        const tokenAddress = "So11111111111111111111111111111111111111112";
        console.log(`🔍 Testing analyzeToken with address: ${tokenAddress}`);

        const result = await analyzeToken(tokenAddress);

        console.log('✅ analyzeToken completed successfully');
        console.log('📊 Result type:', typeof result);
        console.log('📋 Result keys:', Object.keys(result));

        if (result.executiveSummary) {
            console.log('📝 Executive Summary:', result.executiveSummary.substring(0, 100) + '...');
        }

        console.log('🎉 Test completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('🔍 Error details:', error.message);
        console.error('📚 Error stack:', error.stack);
    } finally {
        // Restore original environment
        global.import.meta = originalImportMeta;
        global.fetch = originalFetch;
    }
}

// Run the test
testBrowserAICall();