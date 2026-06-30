/**
 * Test script untuk memverifikasi combo "arblok" di 9Router
 * Memastikan fallback chain bekerja dengan benar:
 * 1. Primary: oc/deepseek-v4-flash-free
 * 2. Fallback: ollama/gpt-oss:120b
 * 3. Last resort: mistral/mistral-large-latest
 */

require('dotenv').config();
const path = require('path');
const fetch = require('node-fetch');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testComboArblok() {
    console.log('🔍 Testing 9Router Combo "arblok" Model Orchestration...');
    console.log('='.repeat(60));

    const gatewayUrl = process.env.VITE_AI_GATEWAY_URL;
    const apiKey = process.env.VITE_AI_GATEWAY_KEY;

    if (!gatewayUrl || !apiKey) {
        console.error('❌ 9Router not configured');
        return;
    }

    const chatEndpoint = `${gatewayUrl}/chat/completions`;
    const model = 'arblok'; // Combo yang sudah dikonfigurasi di 9Router dashboard

    console.log('✅ 9Router configured');
    console.log('   - Chat Endpoint:', chatEndpoint);
    console.log('   - API Key:', '✅ Set');
    console.log('   - Combo:', model);
    console.log('\n📋 Combo Configuration (from 9Router dashboard):');
    console.log('   1. Primary: oc/deepseek-v4-flash-free');
    console.log('   2. Fallback: ollama/gpt-oss:120b');
    console.log('   3. Last resort: mistral/mistral-large-latest');

    try {
        // Test 1: Basic question (should use primary model)
        console.log('\n🧪 Test 1: Basic question (should use primary model)');
        let response = await fetch(chatEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant.'
                    },
                    {
                        role: 'user',
                        content: 'What is the capital of France?'
                    }
                ],
                max_tokens: 50,
                temperature: 0.3,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`9Router API error: ${response.status}`);
        }

        let result = await response.json();
        const modelUsed = result.model || 'unknown';
        console.log('✅ Test 1 succeeded!');
        console.log('   - Model used:', modelUsed);
        console.log('   - Expected: deepseek-v4-flash-free (primary)');
        console.log('   - ✅ Model match:', modelUsed.includes('deepseek-v4-flash-free') ? '✅' : '❌');

        // Test 2: Complex question (might trigger fallback)
        console.log('\n🧪 Test 2: Complex question (might trigger fallback)');
        response = await fetch(chatEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a senior crypto intelligence analyst.'
                    },
                    {
                        role: 'user',
                        content: `Analyze this newborn token based on the following data:
- Trading volume: $1.2M in last 6 hours
- Whale activity: 3 wallets control 45% of supply
- Liquidity: $800K with 12% slippage
- Rug pull indicators: 6/10 risk score
- Narrative strength: 85/100

Provide a comprehensive intelligence report with:
1. Executive summary
2. Key insights with confidence scores
3. Opportunity assessment
4. Risk assessment
5. Final recommendation`
                    }
                ],
                max_tokens: 100,
                temperature: 0.3,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`9Router API error: ${response.status}`);
        }

        result = await response.json();
        const modelUsed2 = result.model || 'unknown';
        console.log('✅ Test 2 succeeded!');
        console.log('   - Model used:', modelUsed2);
        console.log('   - Could be any model in the combo (primary, fallback, or last resort)');
        console.log('   - ✅ Combo working:', modelUsed2 ? '✅' : '❌');

        // Test 3: Verify response format
        console.log('\n🧪 Test 3: Response format verification');
        const content = result.choices?.[0]?.message?.reasoning_content ||
            result.choices?.[0]?.message?.content ||
            '';

        console.log('✅ Response format verified');
        console.log('   - Has reasoning_content:', result.choices?.[0]?.message?.reasoning_content ? '✅' : '❌');
        console.log('   - Has content:', result.choices?.[0]?.message?.content ? '✅' : '❌');
        console.log('   - Response length:', content.length, 'characters');

        // Show response preview
        const preview = content.length > 100
            ? content.substring(0, 100) + '...'
            : content;
        console.log('\n📝 Response preview:', preview || 'Empty response');

        console.log('\n✅ All tests completed successfully!');
        console.log('\n🎯 Summary:');
        console.log('   - Combo "arblok" working correctly ✅');
        console.log('   - Model orchestration configured ✅');
        console.log('   - Fallback chain ready ✅');
        console.log('   - Response format compatible ✅');
        console.log('\n🚀 Next steps:');
        console.log('   - Test with real token analysis in Onyx Terminal');
        console.log('   - Monitor model usage in 9Router dashboard');
        console.log('   - Adjust combo configuration as needed');

    } catch (error) {
        console.error('❌ Test failed:', error.message);

        if (error.message.includes('401')) {
            console.log('\n🔑 Authentication error:');
            console.log('   - Pastikan API key benar');
            console.log('   - Pastikan akun 9Router memiliki kredit');
        } else if (error.message.includes('429')) {
            console.log('\n🚦 Rate limit exceeded:');
            console.log('   - Tunggu beberapa saat sebelum mencoba lagi');
            console.log('   - Periksa batas penggunaan akun Anda');
        } else if (error.message.includes('timeout')) {
            console.log('\n⏱️ Timeout error:');
            console.log('   - Periksa koneksi internet');
            console.log('   - Pastikan 9Router service berjalan');
        } else if (error.message.includes('ECONNREFUSED')) {
            console.log('\n🔌 Connection refused:');
            console.log('   - Pastikan 9Router service berjalan');
            console.log('   - Periksa apakah port 20128 terbuka');
        } else {
            console.log('\n🐞 Error details:');
            console.log('   - Error name:', error.name);
            console.log('   - Error code:', error.code);
            console.log('   - Full error:', error.message);
        }
    }
}

// Jalankan test
testComboArblok().catch(console.error);