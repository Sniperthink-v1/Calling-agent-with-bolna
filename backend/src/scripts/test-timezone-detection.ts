/**
 * Quick test script to verify timezone detection is working
 * Run with: ts-node src/scripts/test-timezone-detection.ts
 */

import geoip from 'geoip-lite';
import { isValidTimezone } from '../utils/timezoneUtils';

console.log('🧪 Testing Timezone Detection\n');

// Test 1: IP-based detection
console.log('--- Test 1: IP-based Detection ---');
const testIPs = [
  { ip: '8.8.8.8', location: 'Google DNS (US)' },
  { ip: '49.207.194.217', location: 'India' },
  { ip: '185.220.101.1', location: 'Europe' },
  { ip: '203.0.113.1', location: 'Unknown' },
];

testIPs.forEach(({ ip, location }) => {
  const geo = geoip.lookup(ip);
  console.log(`\n📍 ${location} (${ip}):`);
  if (geo) {
    console.log(`   Country: ${geo.country}`);
    console.log(`   Timezone: ${geo.timezone}`);
    console.log(`   Valid: ${isValidTimezone(geo.timezone)}`);
  } else {
    console.log('   ❌ No geolocation data found');
  }
});

// Test 2: Timezone validation
console.log('\n\n--- Test 2: Timezone Validation ---');
const testTimezones = [
  'America/New_York',
  'Asia/Kolkata',
  'Europe/London',
  'UTC',
  'Invalid/Timezone',
  'Asia/Calcutta', // Old name for Kolkata
];

testTimezones.forEach(tz => {
  const valid = isValidTimezone(tz);
  console.log(`${valid ? '✅' : '❌'} ${tz}`);
});

// Test 3: Browser timezone simulation
console.log('\n\n--- Test 3: Browser Timezone Detection ---');
try {
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  console.log(`Browser timezone: ${browserTz}`);
  console.log(`Valid: ${isValidTimezone(browserTz)}`);
} catch (error) {
  console.log('❌ Browser timezone detection failed:', error);
}

console.log('\n✅ All tests completed!\n');
