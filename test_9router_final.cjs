/**
 * Test script untuk memverifikasi 9Router Gateway dengan model "arblok"
 * Versi final - menggunakan format yang benar
 * Jalankan dengan: node test_9router_final.cjs
 */

require('dotenv').config();
const path = require('path');
const fetch = require('node-fetch');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function test9RouterFinal() {
    console.log('🔍 Testing 9Router Gateway connection (final)...');

    const gatewayUrl = process.env.VITE_AI_GATEWAY_URL;
    const apiKey = process.env.VITE_AI_GATEWAY_KEY;

    if (!gatewayUrl || !apiKey) {
        console.error('❌ 9Router not configured');
        return;
    }

    // Gunakan combo "arblok" yang sudah dikonfigurasi di 9Router dashboard
    const model = 'arblok';

    // Endpoint yang benar untuk chat
    const chatEndpoint = `${gatewayUrl}/chat/completions`;

    console.log('✅ 9Router configured');
    console.log('   - Chat Endpoint:', chatEndpoint);
    console.log('   - API Key:', '✅ Set');
    console.log('   - Model:', model);

    try {
        console.log('\n📡 Testing 9Router API call (POST to /chat/completions)...');

        const response = await fetch(chatEndpoint, {
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
        console.log('📊 Full response:', JSON.stringify(result, null, 2));

        // Extract content
        const content = result.choices?.[0]?.message?.content || '';
        console.log('   - Model used:', result.model || model);
        console.log('   - Response length:', content.length, 'characters');

        // Tampilkan sebagian response
        const preview = content.length > 100
            ? content.substring(0, 100) + '...'
            : content;
        console.log('\n📝 Response preview:', preview || 'Empty response');

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
            console.log('   - Pastikan 9Router service berjalan');
            console.log('   - Coba lagi nanti');
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
test9RouterFinal().catch(console.error);