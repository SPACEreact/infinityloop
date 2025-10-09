async function testGeminiAPI() {
  const baseUrl = 'http://localhost:8888'; // Netlify dev default port

  console.log('Testing Gemini API with gemini-1.5-pro-latest...');

  try {
    // Test generateContent with gemini-2.5-flash
    console.log('\n--- Testing generateContent with gemini-1.5-pro-latest ---');
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
