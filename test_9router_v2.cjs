/**
 * Test script untuk memverifikasi 9Router Gateway dengan model "arblok"
 * Versi 2 - mencoba format yang berbeda
 * Jalankan dengan: node test_9router_v2.cjs
 */

require('dotenv').config();
const path = require('path');
const fetch = require('node-fetch');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function test9RouterV2() {
    console.log('🔍 Testing 9Router Gateway connection (v2)...');

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
        console.log('\n📡 Testing 9Router API call (GET method)...');

        // Coba dengan GET method dan query parameters
        const queryUrl = new URL(gatewayUrl);
        queryUrl.searchParams.append('model', model);
        queryUrl.searchParams.append('prompt', 'What is the capital of France?');
        queryUrl.searchParams.append('max_tokens', '100');
        queryUrl.searchParams.append('temperature', '0.3');

        const response = await fetch(queryUrl.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`9Router API error (${response.status}): ${errorText}`);
        }

        const result = await response.json();

        console.log('✅ 9Router API call succeeded!');
        console.log('   - Model used:', result.model || model);
        console.log('   - Response length:', result.choices?.[0]?.message?.content?.length || result.response?.length || 0, 'characters');

        // Tampilkan sebagian response
        const content = result.choices?.[0]?.message?.content || result.response || '';
        const preview = content.length > 100
            ? content.substring(0, 100) + '...'
            : content;
        console.log('\n📝 Response preview:', preview);

    } catch (error) {
        console.error('❌ 9Router API call failed:', error.message);

        try {
            console.log('\n📡 Testing 9Router API call (POST method with different format)...');

            // Coba format yang lebih sederhana
            const response = await fetch(gatewayUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    prompt: 'What is the capital of France?',
                    model: model,
                    max_tokens: 100,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`9Router API error (${response.status}): ${errorText}`);
            }

            const result = await response.json();

            console.log('✅ 9Router API call succeeded!');
            console.log('   - Model used:', result.model || model);
            console.log('   - Response length:', result.choices?.[0]?.text?.length || result.response?.length || 0, 'characters');

            // Tampilkan sebagian response
            const content = result.choices?.[0]?.text || result.response || '';
            const preview = content.length > 100
                ? content.substring(0, 100) + '...'
                : content;
            console.log('\n📝 Response preview:', preview);

        } catch (error2) {
            console.error('❌ 9Router API call (alternative format) failed:', error2.message);

            if (error.message.includes('401') || error2.message.includes('401')) {
                console.log('\n🔑 Authentication error:');
                console.log('   - Pastikan API key benar');
                console.log('   - Pastikan akun 9Router memiliki kredit');
            } else if (error.message.includes('429') || error2.message.includes('429')) {
                console.log('\n🚦 Rate limit exceeded:');
                console.log('   - Tunggu beberapa saat sebelum mencoba lagi');
                console.log('   - Periksa batas penggunaan akun Anda');
            } else if (error.message.includes('timeout') || error2.message.includes('timeout')) {
                console.log('\n⏱️ Timeout error:');
                console.log('   - Periksa koneksi internet');
                console.log('   - Pastikan 9Router service berjalan');
                console.log('   - Coba lagi nanti');
            } else if (error.message.includes('ECONNREFUSED') || error2.message.includes('ECONNREFUSED')) {
                console.log('\n🔌 Connection refused:');
                console.log('   - Pastikan 9Router service berjalan');
                console.log('   - Periksa apakah port 20128 terbuka');
            } else {
                console.log('\n🐞 Error details:');
                console.log('   - Error name:', error.name);
                console.log('   - Error code:', error.code);
                console.log('   - Full error 1:', error.message);
                console.log('   - Full error 2:', error2.message);
            }
        }
    }
}

// Jalankan test
test9RouterV2().catch(console.error);