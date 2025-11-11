// Test OpenAI Response Parsing
// Run: node test-openai-response.js

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_PROMPT_ID = process.env.OPENAI_INDIVIDUAL_PROMPT_ID || 'pmpt_68df0dca1f3c81908f78bd0fa1cdddbb0be29b61af4419d7';

// Sample transcript for testing
const SAMPLE_TRANSCRIPT = `
user
Analyze the following call transcript and return the results in JSON format:

assistant: Namaste Jeet, this is Priyanka calling from The Art of Living Foundation on behalf of Radhika Ji. How are you doing today?
user:  im good
assistant:  Hi! I just wanted to check if it’s a good time to share a quick  about our upcoming Happiness Program — it’s a three-to-five-day live workshop that helps reduce stress and boost energy. Would you like to know more?
user:  yes
assistant:  मैं आपको हमारे Happiness Program के बारे में बताना चाहती हूँ — ये three-to-five-day का live workshop है जो stress कम करने, अच्छी नींद लाने और energy बढ़ाने में help करता है through simple breathing techniques, meditation aur joyful group sessions. इसे Radhika Ji guide करती हैं — वो senior Art of Living teacher हैं aur उन्होंने हज़ारों लोगों को help किया है calmer aur happier feel करने में. आप अभी कहीं काम कर रहे हैं या पढ़ाई कर रहे हैं?
user:  im retired
assistant:  बहुत बढ़िया! आप अभी किस शहर में हैं?
user:  गुड़गांव में
assistant:  गुड़गांव बहुत अच्छी जगह है! आपको ज़्यादा stress work से होता है या daily life में?
user:  press press तो होता नहीं मुझे
assistant:  Achha, ये program relaxation aur energy dono बढ़ाने में help करता है, ताकि आपकी daily life और भी peaceful feel हो. क्या आप एक short 15-minute demo schedule करना चाहेंगे, जहाँ coordinator आपको पूरा program experience कराएंगे?
user:  yes sure
assistant:  Perfect! Please बताइए कौन-सी date और exact time आपके लिए convenient रहेगा — for example, five PM या five thirty PM.
user:  five five pm is ok
assistant:  Just to confirm, you said five five PM — did you mean five PM or five thirty PM?
user:  five pm
assistant:  Perfect Jeet! मैंने आपका demo five PM के लिए schedule कर दिया है. May I have your email please ताकि demo confirmation भेज सकूँ?
user:  yes जीत j double e t
assistant:  Got it! So your email is J I I T at what is the domain name and dot something? Could you please share the full email address?
user:  j e e t
assistant:  Thank you for
user:  at the rate gmail dot com
assistant:  Just to confirm, your email is J E E T at G M A I L dot C O M, correct?
user:  yes
assistant:  Perfect! You’ll shortly receive your demo confirmation on this email. बात करके अच्छा लगा — take care!
user:  thank you
assistant:  You’re welcome, Jeet! Have a wonderful day ahead — ध्यान रखिए।
`;

async function testOpenAIResponse() {
  console.log('🧪 Testing OpenAI Response API\n');
  console.log('📝 Using transcript:', SAMPLE_TRANSCRIPT.substring(0, 100) + '...\n');

  try {
    // Call OpenAI Response API
    console.log('📡 Calling OpenAI API...');
    const response = await axios.post(
      'https://api.openai.com/v1/responses',
      {
        prompt: {
          id: OPENAI_PROMPT_ID
        },
        input: [
          {
            role: 'user',
            content: `Analyze the following call transcript and return the results in JSON format:\n\n${SAMPLE_TRANSCRIPT}`
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    console.log('✅ API call successful!\n');
    
    // Log full response structure
    console.log('📦 FULL RESPONSE STRUCTURE:');
    console.log('==========================');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n');

    // Parse response
    console.log('🔍 PARSING RESPONSE:');
    console.log('====================');
    
    // Check output array
    console.log(`\n1️⃣ Output array length: ${response.data.output?.length || 0}`);
    
    if (response.data.output && response.data.output.length > 0) {
      response.data.output.forEach((item, index) => {
        console.log(`\n   Item ${index + 1}:`);
        console.log(`   - Type: ${item.type}`);
        console.log(`   - ID: ${item.id}`);
        
        if (item.type === 'reasoning') {
          console.log(`   - Summary length: ${item.summary?.length || 0}`);
          if (item.content) {
            console.log(`   - Has content: true`);
            console.log(`   - Content preview:`, JSON.stringify(item.content).substring(0, 200));
          }
        }
        
        if (item.type === 'message') {
          console.log(`   - Status: ${item.status}`);
          console.log(`   - Content items: ${item.content?.length || 0}`);
          
          if (item.content && item.content.length > 0) {
            item.content.forEach((c, cidx) => {
              console.log(`\n   Content ${cidx + 1}:`);
              console.log(`   - Type: ${c.type}`);
              console.log(`   - Text length: ${c.text?.length || 0}`);
              if (c.text) {
                console.log(`   - Text preview: ${c.text.substring(0, 200)}...`);
              }
            });
          }
        }
      });
    }

    // Extract and parse the JSON
    console.log('\n\n2️⃣ EXTRACTING JSON DATA:');
    console.log('========================');
    
    const messageOutput = response.data.output.find(item => item.type === 'message');
    if (messageOutput) {
      const textContent = messageOutput.content?.find(
        c => c.type === 'output_text' || c.type === 'text'
      )?.text;
      
      if (textContent) {
        console.log('✅ Found text content\n');
        
        // Clean markdown code blocks
        const cleanedText = textContent
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        
        console.log('📄 Cleaned text:');
        console.log(cleanedText);
        console.log('\n');
        
        // Parse JSON
        try {
          const parsed = JSON.parse(cleanedText);
          console.log('✅ Successfully parsed JSON!\n');
          
          console.log('3️⃣ PARSED DATA STRUCTURE:');
          console.log('=========================');
          console.log(JSON.stringify(parsed, null, 2));
          
          console.log('\n\n4️⃣ REASONING FIELD CHECK:');
          console.log('=========================');
          console.log(`reasoning exists: ${!!parsed.reasoning}`);
          console.log(`reasoning type: ${typeof parsed.reasoning}`);
          console.log(`reasoning value:`, parsed.reasoning);
          
          if (parsed.reasoning) {
            console.log('\n✅ Reasoning is present - all fields:');
            Object.keys(parsed.reasoning).forEach(key => {
              console.log(`   - ${key}: "${parsed.reasoning[key]}"`);
            });
          } else {
            console.log('\n⚠️  Reasoning is NULL or missing!');
            console.log('   This would cause database insert to fail.');
            console.log('   Need to provide default value.');
          }
          
          console.log('\n\n5️⃣ EXTRACTION FIELD CHECK:');
          console.log('==========================');
          console.log(`extraction exists: ${!!parsed.extraction}`);
          if (parsed.extraction) {
            console.log('extraction fields:', Object.keys(parsed.extraction));
            console.log('extraction values:', JSON.stringify(parsed.extraction, null, 2));
          }
          
        } catch (parseError) {
          console.error('❌ Failed to parse JSON:', parseError.message);
          console.log('\nRaw cleaned text was:');
          console.log(cleanedText);
        }
      } else {
        console.log('❌ No text content found in message output');
      }
    } else {
      console.log('❌ No message output found in response');
    }

    console.log('\n\n6️⃣ USAGE STATISTICS:');
    console.log('====================');
    if (response.data.usage) {
      console.log(`Input tokens: ${response.data.usage.prompt_tokens || response.data.usage.input_tokens || 'N/A'}`);
      console.log(`Output tokens: ${response.data.usage.completion_tokens || response.data.usage.output_tokens || 'N/A'}`);
      console.log(`Total tokens: ${response.data.usage.total_tokens || 'N/A'}`);
      if (response.data.usage.input_tokens_details?.cached_tokens) {
        console.log(`Cached tokens: ${response.data.usage.input_tokens_details.cached_tokens}`);
      }
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

console.log('🚀 OpenAI Response API Test\n');
console.log('API Key:', OPENAI_API_KEY ? `${OPENAI_API_KEY.substring(0, 10)}...` : '❌ NOT SET');
console.log('Prompt ID:', OPENAI_PROMPT_ID);
console.log('\n');

testOpenAIResponse()
  .then(() => {
    console.log('\n\n✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n\n❌ Test failed:', error);
    process.exit(1);
  });
