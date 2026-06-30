/**
 * Test script untuk memverifikasi 9Router Gateway dengan model "arblok"
 * Versi 3 - mencoba format response yang benar
 * Jalankan dengan: node test_9router_v3.cjs
 */

require('dotenv').config();
const path = require('path');
const fetch = require('node-fetch');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function test9RouterV3() {
    console.log('🔍 Testing 9Router Gateway connection (v3)...');

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
        console.log('📊 Full response:', JSON.stringify(result, null, 2));

        console.log('✅ 9Router API call succeeded!');
        console.log('   - Model used:', result.model || model);

        // Coba berbagai format response
        let content = '';
        if (result.response) {
            content = result.response;
            console.log('   - Response format: direct response');
        } else if (result.choices?.[0]?.message?.content) {
            content = result.choices[0].message.content;
            console.log('   - Response format: OpenAI-style (choices.message.content)');
        } else if (result.choices?.[0]?.text) {
            content = result.choices[0].text;
            console.log('   - Response format: OpenAI-style (choices.text)');
        } else if (result.output) {
            content = result.output;
            console.log('   - Response format: output field');
        } else if (result.result) {
            content = result.result;
            console.log('   - Response format: result field');
        }

        console.log('   - Response length:', content.length, 'characters');

        // Tampilkan sebagian response
        const preview = content.length > 100
            ? content.substring(0, 100) + '...'
            : content;
        console.log('\n📝 Response preview:', preview || 'Empty response');

    } catch (error) {
        console.error('❌ 9Router API call failed:', error.message);
    }
}

// Jalankan test
test9RouterV3().catch(console.error);