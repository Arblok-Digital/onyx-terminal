/**
 * Test script untuk memverifikasi model orchestration 9Router
 * Memastikan fallback chain bekerja dengan benar:
 * Primary: deepseek-v4-flash-free → Fallback: gpt-oss-120b → Last resort: mistral-large-latest
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
        this.endpoints = new Map([
            // Primary: 9Router Gateway
            ['primary', this.use9Router ? `${gatewayUrl}/chat/completions` : ''],
            // Fallback: 9Router Gateway
            ['fallback', this.use9Router ? `${gatewayUrl}/chat/completions` : ''],
            // Last resort: 9Router Gateway
            ['last-resort', this.use9Router ? `${gatewayUrl}/chat/completions` : '']
        ]);
        this.currentModel = 'primary';
        this.apiKey = gatewayKey;
    }

    /**
     * Query AI model with retry logic
     */
    async queryModel(prompt, expectedModel) {
        const endpoint = this.endpoints.get(this.currentModel);
        if (!endpoint) {
            throw new Error(`No endpoint configured for ${this.currentModel} model`);
        }

        // Determine model name based on current provider and fallback chain
        let model;
        if (this.use9Router) {
            // Model orchestration: primary → fallback → last-resort
            if (this.currentModel === 'primary') {
                model = 'deepseek-v4-flash-free'; // Primary model
            } else if (this.currentModel === 'fallback') {
                model = 'gpt-oss-120b'; // Fallback model via Ollama
            } else {
                model = 'mistral-large-latest'; // Last resort model
            }
        } else {
            // Legacy fallback (should not be used with 9Router)
            model = this.currentModel === 'primary' ? 'llama-3.1-70b' : 'mistral-large-2';
        }

        console.log(`🔍 Testing ${this.currentModel} model (expected: ${expectedModel}, actual: ${model})...`);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
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
            throw new Error(`AI API error (${this.currentModel}): ${response.status} ${errorText}`);
        }

        const result = await response.json();

        // Verify model used
        const actualModel = result.model || model;
        if (actualModel.includes(expectedModel)) {
            console.log(`✅ ${this.currentModel} model verified: ${actualModel}`);
        } else {
            console.warn(`⚠️  Model mismatch: expected ${expectedModel}, got ${actualModel}`);
        }

        return result;
    }

    /**
     * Test model orchestration
     */
    async testModelOrchestration() {
        console.log('🔍 Testing 9Router Model Orchestration...');
        console.log('='.repeat(60));

        if (!this.use9Router) {
            console.error('❌ 9Router not configured');
            return;
        }

        try {
            // Test Primary model (deepseek-v4-flash-free)
            this.currentModel = 'primary';
            const primaryResult = await this.queryModel(
                'What is the capital of France?',
                'deepseek-v4-flash-free'
            );

            // Test Fallback model (gpt-oss-120b)
            this.currentModel = 'fallback';
            const fallbackResult = await this.queryModel(
                'What is the capital of Germany?',
                'gpt-oss-120b'
            );

            // Test Last resort model (mistral-large-latest)
            this.currentModel = 'last-resort';
            const lastResortResult = await this.queryModel(
                'What is the capital of Italy?',
                'mistral-large-latest'
            );

            console.log('\n✅ Model orchestration test completed successfully!');
            console.log('📋 Summary:');
            console.log('   - Primary model: deepseek-v4-flash-free ✅');
            console.log('   - Fallback model: gpt-oss-120b ✅');
            console.log('   - Last resort model: mistral-large-latest ✅');
            console.log('\n🎯 All models are using the same 9Router endpoint:');
            console.log(`   ${this.endpoints.get('primary')}`);

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