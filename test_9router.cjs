/**
 * Test script untuk memverifikasi 9Router Gateway dengan model "arblok"
 * Jalankan dengan: node test_9router.cjs
 */

require('dotenv').config();
const path = require('path');
const fetch = require('node-fetch');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function test9Router() {
    console.log('🔍 Testing 9Router Gateway connection...');

    const gatewayUrl = process.env.VITE_AI_GATEWAY_URL;
    const apiKey = process.env.VITE_AI_GATEWAY_KEY;
    const model = process.env.VITE_AI_MODEL;

    if (!gatewayUrl || !apiKey || !model) {
        console.error('❌ 9Router not configured');
        console.log('   - Gateway URL:', gatewayUrl ? '✅ Set' : '❌ Missing');
        console.log('   - API Key:', apiKey ? '✅ Set' : '❌ Missing');
        console.log('   - Model:', model ? '✅ Set' : '❌ Missing');
        return;
    }

    console.log('✅ 9Router configured');
    console.log('   - Gateway URL:', gatewayUrl);
    console.log('   - API Key:', '✅ Set (length:', apiKey.length, ')');
    console.log('   - Model:', model);

    try {
        console.log('\n📡 Testing 9Router API call...');

        const response = await fetch(gatewayUrl, {
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
            throw new Error(`9Router API error (${response.status}): ${errorText}`);
        }

        const result = await response.json();

        console.log('✅ 9Router API call succeeded!');
        console.log('   - Model used:', result.model || model);
        console.log('   - Response length:', result.choices?.[0]?.message?.content?.length || 0, 'characters');

        // Tampilkan sebagian response
        const content = result.choices?.[0]?.message?.content || '';
        const preview = content.length > 100
            ? content.substring(0, 100) + '...'
            : content;
        console.log('\n📝 Response preview:', preview);

    } catch (error) {
        console.error('❌ 9Router API call failed:', error.message);

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
            console.log('   - Pastikan Jupiter proxy berjalan');
            console.log('   - Coba lagi nanti');
        } else if (error.message.includes('ECONNREFUSED')) {
            console.log('\n🔌 Connection refused:');
            console.log('   - Pastikan Jupiter proxy berjalan');
            console.log('   - Jalankan: node jup-proxy.js');
            console.log('   - Periksa apakah port 20128 terbuka');
        } else {
            console.log('\n🐞 Error details:');
            console.log('   - Error name:', error.name);
            console.log('   - Error code:', error.code);
            console.log('   - Full error:', error);
        }
    }
}

// Jalankan test
test9Router().catch(console.error);