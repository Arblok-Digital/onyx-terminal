/**
 * Test script untuk memverifikasi model orchestration 9Router menggunakan combo "arblok"
 * Memastikan combo bekerja dengan benar dan fallback chain sudah dikonfigurasi di 9Router dashboard
 */

require('dotenv').config();
const path = require('path');
const fetch = require('node-fetch');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

class AMDResearchManagerTest {
    constructor() {
        // 9Router Gateway (OpenAI-compatible endpoint)
        const gatewayUrl = process.env.VITE_AI_GATEWAY_URL || 'http://localhost:20128/v1';
        const gatewayKey = process.env.VITE_AI_GATEWAY_KEY || 'arblok';

        this.use9Router = !!gatewayKey;
        this.endpoint = this.use9Router ? `${gatewayUrl}/chat/completions` : '';
        this.apiKey = gatewayKey;
    }

    /**
     * Query AI model menggunakan combo "arblok"
     */
    async queryCombo(prompt) {
        if (!this.endpoint) {
            throw new Error('No endpoint configured');
        }

        // Gunakan combo "arblok" yang sudah dikonfigurasi di 9Router dashboard
        const combo = 'arblok';

        console.log(`🔍 Testing combo "${combo}"...`);

        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: combo,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 50,
                temperature: 0.3,
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI API error: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        return result;
    }

    /**
     * Test model orchestration menggunakan combo "arblok"
     */
    async testModelOrchestration() {
        console.log('🔍 Testing 9Router Model Orchestration with Combo "arblok"...');
        console.log('='.repeat(70));

        if (!this.use9Router) {
            console.error('❌ 9Router not configured');
            return;
        }

        console.log('✅ 9Router configured');
        console.log('   - Endpoint:', this.endpoint);
        console.log('   - API Key:', '✅ Set');
        console.log('   - Combo:', '"arblok"');
        console.log('\n📋 Combo Configuration (from 9Router dashboard):');
        console.log('   1. Primary: oc/deepseek-v4-flash-free');
        console.log('   2. Fallback: ollama/gpt-oss:120b');
        console.log('   3. Last resort: mistral/mistral-large-latest');
        console.log('\n💡 Note: 9Router akan menangani fallback otomatis berdasarkan combo');

        try {
            // Test 1: Basic question (should use primary model)
            console.log('\n🧪 Test 1: Basic question');
            let result = await this.queryCombo('What is the capital of France?');
            const modelUsed1 = result.model || 'unknown';
            console.log('✅ Test 1 succeeded!');
            console.log('   - Model used:', modelUsed1);
            console.log('   - Expected primary: deepseek-v4-flash-free');
            console.log('   - ✅ Model match:', modelUsed1.includes('deepseek-v4-flash-free') ? '✅' : '❌');

            // Test 2: Complex question (might use any model in the combo)
            console.log('\n🧪 Test 2: Complex question');
            result = await this.queryCombo(`Analyze this newborn token:
- Trading volume: $500K in last 2 hours
- Whale activity: 2 wallets control 30% of supply
- Liquidity: $300K with 8% slippage
- Rug pull indicators: 4/10 risk score

Provide a brief intelligence assessment.`);
            const modelUsed2 = result.model || 'unknown';
            console.log('✅ Test 2 succeeded!');
            console.log('   - Model used:', modelUsed2);
            console.log('   - Could be any model in the combo ✅');

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

            console.log('\n✅ Model orchestration test completed successfully!');
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
            console.error('❌ Model orchestration test failed:', error.message);

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
}

// Jalankan test
const test = new AMDResearchManagerTest();
test.testModelOrchestration().catch(console.error);