/**
 * Check User Sessions Script
 * 
 * Directly queries the database to check user session statistics
 */

const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkUserSessions() {
  try {
    console.log('🔍 Checking user sessions...\n');
    
    // Total sessions count
    const totalQuery = `
      SELECT COUNT(*) as total_count,
             MAX(created_at) as latest_session,
             MIN(created_at) as earliest_session
      FROM user_sessions
    `;
    
    const totalResult = await pool.query(totalQuery);
    console.log('📊 Total Sessions:');
    console.log(`   - Total Count: ${totalResult.rows[0].total_count}`);
    console.log(`   - Latest Session: ${totalResult.rows[0].latest_session}`);
    console.log(`   - Earliest Session: ${totalResult.rows[0].earliest_session}\n`);
    
    // Active sessions count
    const activeQuery = `
      SELECT COUNT(*) as active_count
      FROM user_sessions
      WHERE is_active = true AND expires_at > CURRENT_TIMESTAMP
    `;
    
    const activeResult = await pool.query(activeQuery);
    console.log('✅ Active Sessions:');
    console.log(`   - Active Count: ${activeResult.rows[0].active_count}\n`);
    
    // Expired but not cleaned up
    const expiredQuery = `
      SELECT COUNT(*) as expired_count
      FROM user_sessions
      WHERE expires_at < CURRENT_TIMESTAMP OR is_active = false
    `;
    
    const expiredResult = await pool.query(expiredQuery);
    console.log('❌ Expired/Inactive Sessions:');
    console.log(`   - Expired Count: ${expiredResult.rows[0].expired_count}\n`);
    
    // Sessions by age
    const ageQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as last_hour,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as last_day,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as last_week,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as last_month,
        COUNT(*) FILTER (WHERE created_at <= NOW() - INTERVAL '30 days') as older
      FROM user_sessions
    `;
    
    const ageResult = await pool.query(ageQuery);
    console.log('📅 Sessions by Age:');
    console.log(`   - Last Hour: ${ageResult.rows[0].last_hour}`);
    console.log(`   - Last Day: ${ageResult.rows[0].last_day}`);
    console.log(`   - Last Week: ${ageResult.rows[0].last_week}`);
    console.log(`   - Last Month: ${ageResult.rows[0].last_month}`);
    console.log(`   - Older than 30 days: ${ageResult.rows[0].older}\n`);
    
    // Sessions per user
    const userQuery = `
      SELECT 
        user_id,
        COUNT(*) as session_count,
        COUNT(*) FILTER (WHERE is_active = true AND expires_at > CURRENT_TIMESTAMP) as active_count,
        MAX(created_at) as last_session
      FROM user_sessions
      GROUP BY user_id
      ORDER BY session_count DESC
      LIMIT 10
    `;
    
    const userResult = await pool.query(userQuery);
    console.log('👥 Top 10 Users by Session Count:');
    userResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. User ${row.user_id.substring(0, 8)}...`);
      console.log(`      - Total Sessions: ${row.session_count}`);
      console.log(`      - Active Sessions: ${row.active_count}`);
      console.log(`      - Last Session: ${row.last_session}`);
    });
    
    console.log('\n✅ Session check complete!');
    
  } catch (error) {
    console.error('❌ Error checking sessions:', error);
  } finally {
    await pool.end();
  }
}

checkUserSessions();
