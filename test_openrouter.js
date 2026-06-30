/**
 * Test script untuk memverifikasi OpenRouter API key dan koneksi
 * Jalankan dengan: node test_openrouter.js
 */

require('dotenv').config();
const { getOpenRouterProvider } = require('./amd_integration/core/openRouterProvider');

async function testOpenRouter() {
    console.log('🔍 Testing OpenRouter connection...');

    const provider = getOpenRouterProvider();

    if (!provider.isAvailable()) {
        console.error('❌ OpenRouter provider not available');
        console.log('   - API Key:', process.env.VITE_OPENROUTER_API_KEY ? '✅ Set' : '❌ Missing');
        console.log('   - Enabled:', process.env.VITE_OPENROUTER_ENABLED !== 'false' ? '✅ Enabled' : '❌ Disabled');
        return;
    }

    console.log('✅ OpenRouter provider available');
    console.log('   - API Key:', process.env.VITE_OPENROUTER_API_KEY ? '✅ Set' : '❌ Missing');
    console.log('   - Endpoint:', 'https://openrouter.ai/api/v1/chat/completions');

    try {
        console.log('\n📡 Testing OpenRouter API call...');

        const messages = [
            {
                role: 'system',
                content: 'You are a helpful assistant.'
            },
            {
                role: 'user',
                content: 'Hello! What is the capital of France?'
            }
        ];

        const result = await provider.chatWithFallback(messages, 'general');

        console.log('✅ OpenRouter API call succeeded!');
        console.log('   - Model used:', result.model);
        console.log('   - Response length:', result.content.length, 'characters');
        console.log('   - Is fallback:', result.isFallback ? 'Yes' : 'No');

        // Tampilkan sebagian response
        const preview = result.content.length > 100
            ? result.content.substring(0, 100) + '...'
            : result.content;
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
        }
    }
}

// Jalankan test
testOpenRouter().catch(console.error);