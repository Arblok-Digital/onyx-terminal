/**
 * Simple test script untuk memverifikasi OpenRouter API key dan koneksi
 * Jalankan dengan: node test_openrouter_simple.cjs
 */

require('dotenv').config();
const path = require('path');
const fetch = require('node-fetch');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function testOpenRouterSimple() {
    console.log('🔍 Testing OpenRouter connection (simple)...');

    const apiKey = process.env.VITE_OPENROUTER_API_KEY;
    const enabled = process.env.VITE_OPENROUTER_ENABLED !== 'false';

    if (!apiKey || !enabled) {
        console.error('❌ OpenRouter not configured');
        console.log('   - API Key:', apiKey ? '✅ Set' : '❌ Missing');
        console.log('   - Enabled:', enabled ? '✅ Enabled' : '❌ Disabled');
        return;
    }

    console.log('✅ OpenRouter configured');
    console.log('   - API Key:', '✅ Set (length:', apiKey.length, ')');
    console.log('   - Endpoint:', 'https://openrouter.ai/api/v1/chat/completions');

    try {
        console.log('\n📡 Testing OpenRouter API call...');

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://onyx-terminal.app',
                'X-Title': 'Onyx Terminal - AI Intelligence'
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3.3-70b-instruct:free',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant.'
                    },
                    {
                        role: 'user',
                        content: 'Hello! What is the capital of France?'
                    }
                ],
                max_tokens: 100,
                temperature: 0.3,
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
        }

        const result = await response.json();

        console.log('✅ OpenRouter API call succeeded!');
        console.log('   - Model used:', result.model);
        console.log('   - Response length:', result.choices?.[0]?.message?.content?.length || 0, 'characters');

        // Tampilkan sebagian response
        const content = result.choices?.[0]?.message?.content || '';
        const preview = content.length > 100
            ? content.substring(0, 100) + '...'
            : content;
        console.log('\n📝 Response preview:', preview);

    } catch (error) {
        console.error('❌ OpenRouter API call failed:', error.message);

        if (error.message.includes('401')) {
            console.log('\n🔑 Authentication error:');
            console.log('   - Pastikan API key benar');
            console.log('   - Pastikan akun OpenRouter memiliki kredit');
            console.log('   - Pastikan IP tidak diblokir');
        } else if (error.message.includes('429')) {
            console.log('\n🚦 Rate limit exceeded:');
            console.log('   - Tunggu beberapa saat sebelum mencoba lagi');
            console.log('   - Periksa batas penggunaan akun Anda');
        } else if (error.message.includes('timeout')) {
            console.log('\n⏱️ Timeout error:');
            console.log('   - Periksa koneksi internet');
            console.log('   - Coba lagi nanti');
        } else {
            console.log('\n🐞 Error details:');
            console.log('   - Error name:', error.name);
            console.log('   - Error code:', error.code);
            console.log('   - Full error:', error);
        }
    }
}

// Jalankan test
testOpenRouterSimple().catch(console.error);