/**
 * Test script untuk memverifikasi 9Router Gateway dengan model "arblok"
 * Versi 4 - mencoba endpoint yang benar
 * Jalankan dengan: node test_9router_v4.cjs
 */

require('dotenv').config();
const path = require('path');
const fetch = require('node-fetch');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function test9RouterV4() {
    console.log('🔍 Testing 9Router Gateway connection (v4)...');

    const gatewayUrl = process.env.VITE_AI_GATEWAY_URL;
    const apiKey = process.env.VITE_AI_GATEWAY_KEY;
    const model = process.env.VITE_AI_MODEL;

    if (!gatewayUrl || !apiKey || !model) {
        console.error('❌ 9Router not configured');
        return;
    }

    console.log('✅ 9Router configured');
    console.log('   - Gateway URL:', gatewayUrl);
    console.log('   - API Key:', '✅ Set');
    console.log('   - Model:', model);

    // Coba berbagai endpoint
    const endpointsToTry = [
        `${gatewayUrl}/chat`,
        `${gatewayUrl}/completions`,
        `${gatewayUrl}/v1/chat`,
        `${gatewayUrl}/v1/completions`,
        `${gatewayUrl}/chat/completions`,
        `${gatewayUrl}/v1/chat/completions`
    ];

    for (const endpoint of endpointsToTry) {
        try {
            console.log(`\n📡 Testing endpoint: ${endpoint}`);

            // Coba dengan GET method
            const queryUrl = new URL(endpoint);
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
                console.log(`   ❌ GET ${endpoint} failed: ${response.status}`);
                continue;
            }

            const result = await response.json();
            console.log(`   ✅ GET ${endpoint} succeeded!`);
            console.log('   📊 Response:', JSON.stringify(result, null, 2));

            // Coba juga dengan POST method
            try {
                console.log(`\n   📡 Testing POST ${endpoint}...`);
                const postResponse = await fetch(endpoint, {
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
                        max_tokens: 100,
                        temperature: 0.3
                    })
                });

                if (!postResponse.ok) {
                    console.log(`   ❌ POST ${endpoint} failed: ${postResponse.status}`);
                } else {
                    const postResult = await postResponse.json();
                    console.log(`   ✅ POST ${endpoint} succeeded!`);
                    console.log('   📊 POST Response:', JSON.stringify(postResult, null, 2));
                }
            } catch (postError) {
                console.log(`   ❌ POST ${endpoint} error: ${postError.message}`);
            }

            return; // Berhenti jika endpoint berhasil

        } catch (error) {
            console.log(`   ❌ Error testing ${endpoint}: ${error.message}`);
        }
    }

    console.log('\n🔍 Tidak ada endpoint yang berhasil. Mencoba endpoint default dengan format berbeda...');

    // Coba endpoint default dengan format yang berbeda
    try {
        const endpoint = gatewayUrl;
        console.log(`\n📡 Testing endpoint: ${endpoint} dengan format custom`);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                prompt: 'What is the capital of France?',
                model: model,
                max_tokens: 100,
                temperature: 0.3,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log(`   ✅ Custom format succeeded!`);
        console.log('   📊 Response:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.log(`   ❌ Custom format error: ${error.message}`);
    }
}

// Jalankan test
test9RouterV4().catch(console.error);