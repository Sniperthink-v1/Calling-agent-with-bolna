// Timezone data with city names and UTC offsets
// This allows searching by city name or UTC offset

export interface TimezoneInfo {
  value: string;        // IANA timezone identifier (e.g., "America/New_York")
  label: string;        // Display label (e.g., "New York")
  utcOffset: string;    // UTC offset (e.g., "UTC-5")
  utcOffsetMinutes: number; // Offset in minutes for sorting
  cities: string[];     // Associated cities for search
}

export const timezones: TimezoneInfo[] = [
  // UTC-12 to UTC-11
  { value: "Pacific/Midway", label: "Midway Island", utcOffset: "UTC-11", utcOffsetMinutes: -660, cities: ["Midway", "Samoa"] },
  { value: "Pacific/Honolulu", label: "Hawaii", utcOffset: "UTC-10", utcOffsetMinutes: -600, cities: ["Honolulu", "Hawaii"] },
  
  // UTC-9 to UTC-8
  { value: "America/Anchorage", label: "Alaska", utcOffset: "UTC-9", utcOffsetMinutes: -540, cities: ["Anchorage", "Juneau"] },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)", utcOffset: "UTC-8", utcOffsetMinutes: -480, cities: ["Los Angeles", "San Francisco", "Seattle", "Portland", "Las Vegas", "San Diego"] },
  { value: "America/Tijuana", label: "Tijuana, Baja California", utcOffset: "UTC-8", utcOffsetMinutes: -480, cities: ["Tijuana", "Mexicali"] },
  
  // UTC-7
  { value: "America/Denver", label: "Mountain Time (US & Canada)", utcOffset: "UTC-7", utcOffsetMinutes: -420, cities: ["Denver", "Phoenix", "Salt Lake City", "Albuquerque"] },
  { value: "America/Arizona", label: "Arizona", utcOffset: "UTC-7", utcOffsetMinutes: -420, cities: ["Phoenix", "Tucson"] },
  { value: "America/Chihuahua", label: "Chihuahua, La Paz, Mazatlan", utcOffset: "UTC-7", utcOffsetMinutes: -420, cities: ["Chihuahua", "La Paz", "Mazatlan"] },
  
  // UTC-6
  { value: "America/Chicago", label: "Central Time (US & Canada)", utcOffset: "UTC-6", utcOffsetMinutes: -360, cities: ["Chicago", "Dallas", "Houston", "Austin", "San Antonio", "Memphis"] },
  { value: "America/Mexico_City", label: "Mexico City", utcOffset: "UTC-6", utcOffsetMinutes: -360, cities: ["Mexico City", "Guadalajara", "Monterrey"] },
  { value: "America/Guatemala", label: "Central America", utcOffset: "UTC-6", utcOffsetMinutes: -360, cities: ["Guatemala", "San Salvador", "Managua"] },
  
  // UTC-5
  { value: "America/New_York", label: "Eastern Time (US & Canada)", utcOffset: "UTC-5", utcOffsetMinutes: -300, cities: ["New York", "Boston", "Philadelphia", "Miami", "Atlanta", "Washington"] },
  { value: "America/Bogota", label: "Bogota, Lima, Quito", utcOffset: "UTC-5", utcOffsetMinutes: -300, cities: ["Bogota", "Lima", "Quito"] },
  { value: "America/Toronto", label: "Toronto, Montreal", utcOffset: "UTC-5", utcOffsetMinutes: -300, cities: ["Toronto", "Montreal", "Ottawa"] },
  
  // UTC-4
  { value: "America/Caracas", label: "Caracas", utcOffset: "UTC-4", utcOffsetMinutes: -240, cities: ["Caracas"] },
  { value: "America/Santiago", label: "Santiago", utcOffset: "UTC-4", utcOffsetMinutes: -240, cities: ["Santiago"] },
  { value: "America/La_Paz", label: "La Paz", utcOffset: "UTC-4", utcOffsetMinutes: -240, cities: ["La Paz"] },
  
  // UTC-3.5
  { value: "America/St_Johns", label: "Newfoundland", utcOffset: "UTC-3:30", utcOffsetMinutes: -210, cities: ["St Johns"] },
  
  // UTC-3
  { value: "America/Sao_Paulo", label: "Brasilia", utcOffset: "UTC-3", utcOffsetMinutes: -180, cities: ["Sao Paulo", "Rio de Janeiro", "Brasilia"] },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires", utcOffset: "UTC-3", utcOffsetMinutes: -180, cities: ["Buenos Aires", "Cordoba"] },
  { value: "America/Montevideo", label: "Montevideo", utcOffset: "UTC-3", utcOffsetMinutes: -180, cities: ["Montevideo"] },
  
  // UTC-2 to UTC-1
  { value: "Atlantic/South_Georgia", label: "Mid-Atlantic", utcOffset: "UTC-2", utcOffsetMinutes: -120, cities: ["South Georgia"] },
  { value: "Atlantic/Azores", label: "Azores", utcOffset: "UTC-1", utcOffsetMinutes: -60, cities: ["Azores"] },
  
  // UTC+0
  { value: "UTC", label: "UTC", utcOffset: "UTC+0", utcOffsetMinutes: 0, cities: ["UTC", "GMT"] },
  { value: "Europe/London", label: "London, Dublin, Lisbon", utcOffset: "UTC+0", utcOffsetMinutes: 0, cities: ["London", "Dublin", "Lisbon", "Edinburgh"] },
  { value: "Africa/Casablanca", label: "Casablanca", utcOffset: "UTC+0", utcOffsetMinutes: 0, cities: ["Casablanca", "Rabat"] },
  
  // UTC+1
  { value: "Europe/Paris", label: "Paris, Brussels, Amsterdam", utcOffset: "UTC+1", utcOffsetMinutes: 60, cities: ["Paris", "Brussels", "Amsterdam", "Berlin", "Rome", "Madrid", "Vienna"] },
  { value: "Europe/Berlin", label: "Berlin, Frankfurt, Munich", utcOffset: "UTC+1", utcOffsetMinutes: 60, cities: ["Berlin", "Frankfurt", "Munich", "Hamburg"] },
  { value: "Europe/Warsaw", label: "Warsaw, Prague, Budapest", utcOffset: "UTC+1", utcOffsetMinutes: 60, cities: ["Warsaw", "Prague", "Budapest", "Belgrade"] },
  { value: "Africa/Lagos", label: "West Central Africa", utcOffset: "UTC+1", utcOffsetMinutes: 60, cities: ["Lagos", "Kinshasa", "Luanda"] },
  
  // UTC+2
  { value: "Europe/Athens", label: "Athens, Istanbul, Helsinki", utcOffset: "UTC+2", utcOffsetMinutes: 120, cities: ["Athens", "Istanbul", "Helsinki", "Kyiv", "Bucharest"] },
  { value: "Africa/Cairo", label: "Cairo", utcOffset: "UTC+2", utcOffsetMinutes: 120, cities: ["Cairo", "Alexandria"] },
  { value: "Africa/Johannesburg", label: "Johannesburg, Pretoria", utcOffset: "UTC+2", utcOffsetMinutes: 120, cities: ["Johannesburg", "Pretoria", "Cape Town"] },
  { value: "Asia/Jerusalem", label: "Jerusalem", utcOffset: "UTC+2", utcOffsetMinutes: 120, cities: ["Jerusalem", "Tel Aviv"] },
  
  // UTC+3
  { value: "Europe/Moscow", label: "Moscow, St. Petersburg", utcOffset: "UTC+3", utcOffsetMinutes: 180, cities: ["Moscow", "St. Petersburg", "Volgograd"] },
  { value: "Asia/Baghdad", label: "Baghdad, Kuwait, Riyadh", utcOffset: "UTC+3", utcOffsetMinutes: 180, cities: ["Baghdad", "Kuwait", "Riyadh"] },
  { value: "Africa/Nairobi", label: "Nairobi", utcOffset: "UTC+3", utcOffsetMinutes: 180, cities: ["Nairobi", "Addis Ababa"] },
  
  // UTC+3:30
  { value: "Asia/Tehran", label: "Tehran", utcOffset: "UTC+3:30", utcOffsetMinutes: 210, cities: ["Tehran"] },
  
  // UTC+4
  { value: "Asia/Dubai", label: "Abu Dhabi, Dubai, Muscat", utcOffset: "UTC+4", utcOffsetMinutes: 240, cities: ["Dubai", "Abu Dhabi", "Muscat"] },
  { value: "Asia/Baku", label: "Baku, Tbilisi, Yerevan", utcOffset: "UTC+4", utcOffsetMinutes: 240, cities: ["Baku", "Tbilisi", "Yerevan"] },
  
  // UTC+4:30
  { value: "Asia/Kabul", label: "Kabul", utcOffset: "UTC+4:30", utcOffsetMinutes: 270, cities: ["Kabul"] },
  
  // UTC+5
  { value: "Asia/Karachi", label: "Islamabad, Karachi", utcOffset: "UTC+5", utcOffsetMinutes: 300, cities: ["Karachi", "Islamabad", "Lahore"] },
  { value: "Asia/Tashkent", label: "Tashkent", utcOffset: "UTC+5", utcOffsetMinutes: 300, cities: ["Tashkent"] },
  
  // UTC+5:30
  { value: "Asia/Kolkata", label: "Mumbai, Kolkata, New Delhi", utcOffset: "UTC+5:30", utcOffsetMinutes: 330, cities: ["Mumbai", "Delhi", "Kolkata", "Bangalore", "Chennai", "Hyderabad"] },
  { value: "Asia/Colombo", label: "Sri Jayawardenepura", utcOffset: "UTC+5:30", utcOffsetMinutes: 330, cities: ["Colombo"] },
  
  // UTC+5:45
  { value: "Asia/Kathmandu", label: "Kathmandu", utcOffset: "UTC+5:45", utcOffsetMinutes: 345, cities: ["Kathmandu"] },
  
  // UTC+6
  { value: "Asia/Dhaka", label: "Dhaka", utcOffset: "UTC+6", utcOffsetMinutes: 360, cities: ["Dhaka"] },
  { value: "Asia/Almaty", label: "Almaty, Novosibirsk", utcOffset: "UTC+6", utcOffsetMinutes: 360, cities: ["Almaty"] },
  
  // UTC+6:30
  { value: "Asia/Yangon", label: "Yangon (Rangoon)", utcOffset: "UTC+6:30", utcOffsetMinutes: 390, cities: ["Yangon", "Rangoon"] },
  
  // UTC+7
  { value: "Asia/Bangkok", label: "Bangkok, Hanoi, Jakarta", utcOffset: "UTC+7", utcOffsetMinutes: 420, cities: ["Bangkok", "Hanoi", "Jakarta"] },
  { value: "Asia/Krasnoyarsk", label: "Krasnoyarsk", utcOffset: "UTC+7", utcOffsetMinutes: 420, cities: ["Krasnoyarsk"] },
  
  // UTC+8
  { value: "Asia/Shanghai", label: "Beijing, Chongqing, Hong Kong", utcOffset: "UTC+8", utcOffsetMinutes: 480, cities: ["Beijing", "Shanghai", "Hong Kong", "Chongqing"] },
  { value: "Asia/Singapore", label: "Singapore, Kuala Lumpur", utcOffset: "UTC+8", utcOffsetMinutes: 480, cities: ["Singapore", "Kuala Lumpur"] },
  { value: "Australia/Perth", label: "Perth", utcOffset: "UTC+8", utcOffsetMinutes: 480, cities: ["Perth"] },
  { value: "Asia/Taipei", label: "Taipei", utcOffset: "UTC+8", utcOffsetMinutes: 480, cities: ["Taipei"] },
  
  // UTC+9
  { value: "Asia/Tokyo", label: "Tokyo, Osaka, Sapporo", utcOffset: "UTC+9", utcOffsetMinutes: 540, cities: ["Tokyo", "Osaka", "Sapporo"] },
  { value: "Asia/Seoul", label: "Seoul", utcOffset: "UTC+9", utcOffsetMinutes: 540, cities: ["Seoul"] },
  { value: "Asia/Yakutsk", label: "Yakutsk", utcOffset: "UTC+9", utcOffsetMinutes: 540, cities: ["Yakutsk"] },
  
  // UTC+9:30
  { value: "Australia/Adelaide", label: "Adelaide", utcOffset: "UTC+9:30", utcOffsetMinutes: 570, cities: ["Adelaide"] },
  { value: "Australia/Darwin", label: "Darwin", utcOffset: "UTC+9:30", utcOffsetMinutes: 570, cities: ["Darwin"] },
  
  // UTC+10
  { value: "Australia/Sydney", label: "Sydney, Melbourne, Canberra", utcOffset: "UTC+10", utcOffsetMinutes: 600, cities: ["Sydney", "Melbourne", "Canberra", "Brisbane"] },
  { value: "Australia/Brisbane", label: "Brisbane", utcOffset: "UTC+10", utcOffsetMinutes: 600, cities: ["Brisbane"] },
  { value: "Pacific/Guam", label: "Guam, Port Moresby", utcOffset: "UTC+10", utcOffsetMinutes: 600, cities: ["Guam", "Port Moresby"] },
  
  // UTC+11
  { value: "Asia/Vladivostok", label: "Vladivostok", utcOffset: "UTC+11", utcOffsetMinutes: 660, cities: ["Vladivostok"] },
  
  // UTC+12
  { value: "Pacific/Auckland", label: "Auckland, Wellington", utcOffset: "UTC+12", utcOffsetMinutes: 720, cities: ["Auckland", "Wellington"] },
  { value: "Pacific/Fiji", label: "Fiji", utcOffset: "UTC+12", utcOffsetMinutes: 720, cities: ["Fiji", "Suva"] },
];

/**
 * Search timezones by query (city name or UTC offset)
 * @param query - Search query (e.g., "London", "UTC+5:30", "+5:30", "India")
 * @returns Matching timezones
 */
export function searchTimezones(query: string): TimezoneInfo[] {
  if (!query || query.trim().length === 0) {
    return timezones;
  }

  const searchTerm = query.toLowerCase().trim();
  
  return timezones.filter((tz) => {
    // Match by label
    if (tz.label.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Match by UTC offset (e.g., "UTC+5:30", "+5:30", "5:30")
    if (tz.utcOffset.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Match by city names
    if (tz.cities.some(city => city.toLowerCase().includes(searchTerm))) {
      return true;
    }
    
    // Match by timezone value (IANA identifier)
    if (tz.value.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    return false;
  });
}

/**
 * Get timezone info by value (IANA identifier)
 */
export function getTimezoneByValue(value: string): TimezoneInfo | undefined {
  return timezones.find(tz => tz.value === value);
}
