async function testGeminiAPI() {
  const baseUrl = 'http://localhost:8888'; // Netlify dev default port

  console.log('Testing Gemini API...');

  try {
    // Test listModels
    console.log('\n--- Testing listModels ---');
    const listResponse = await fetch(`${baseUrl}/.netlify/functions/gemini-api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'listModels' })
    });

    if (listResponse.ok) {
      const listData = await listResponse.json();
      console.log('✅ listModels successful');
      if (listData.data && listData.data.models) {
        console.log('\nAvailable Models:');
        listData.data.models.forEach((model, index) => {
          console.log(`${index + 1}. ${model.name}`);
          console.log(`   Description: ${model.description}`);
          console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
          console.log('');
        });
      } else {
        console.log('Response:', JSON.stringify(listData, null, 2));
      }
    } else {
      console.log('❌ listModels failed:', listResponse.status, listResponse.statusText);
      const errorText = await listResponse.text();
      console.log('Error:', errorText);
    }

    // Test generateContent with first available model that supports generateContent
    console.log('\n--- Testing generateContent ---');
    const generateResponse = await fetch(`${baseUrl}/.netlify/functions/gemini-api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generateContent',
        prompt: 'Hello, can you help me with a simple film idea?',
        model: 'gemini-1.5-pro-latest'
      })
    });

    if (generateResponse.ok) {
      const generateData = await generateResponse.json();
      console.log('✅ generateContent successful');
      console.log('Response:', generateData.data);
    } else {
      console.log('❌ generateContent failed:', generateResponse.status, generateResponse.statusText);
      const errorText = await generateResponse.text();
      console.log('Error:', errorText);
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testGeminiAPI();
