/**
 * Test Field Library API Endpoint
 * 
 * INSTRUCTIONS:
 * 1. Make sure your backend is running on http://localhost:3000
 * 2. Open browser console (F12)
 * 3. Copy this entire script
 * 4. Paste into console and press Enter
 * 5. Check the output
 */

(async function testFieldLibrary() {
  console.log('🧪 Testing Field Library API...');
  
  try {
    // Get auth token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ No auth token found in localStorage');
      return;
    }
    console.log('✅ Token found:', token.substring(0, 20) + '...');
    
    // Make API call
    const response = await fetch('http://localhost:3000/api/admin/field-library', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response statusText:', response.statusText);
    
    if (!response.ok) {
      console.error('❌ Response not OK');
      const errorText = await response.text();
      console.error('Error body:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ SUCCESS! Data received:');
    console.log('📊 Full response:', data);
    console.log('📋 Total fields:', data.total);
    console.log('📂 Categories:', data.categories);
    console.log('🗃️ allFields length:', data.allFields?.length);
    console.log('🎯 First 3 fields:', data.allFields?.slice(0, 3));
    
    // Check if allFields is actually populated
    if (!data.allFields || data.allFields.length === 0) {
      console.error('⚠️ allFields is empty or undefined!');
    } else {
      console.log('✅ allFields populated with', data.allFields.length, 'fields');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
})();
