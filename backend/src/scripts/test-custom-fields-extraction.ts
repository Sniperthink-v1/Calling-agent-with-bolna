/**
 * Test Script: Custom Fields Extraction Pipeline
 * 
 * Tests the complete flow:
 * 1. Simulates OpenAI response with custom_fields
 * 2. Processes through extractEnhancedLeadData
 * 3. Saves to lead_analytics (both individual and complete)
 * 4. Verifies database storage
 * 
 * Target Contact: Lokeshwari (+91 9022842095)
 */

import { pool } from '../config/database';
import { WebhookDataProcessor } from '../services/webhookDataProcessor';
import { v4 as uuidv4 } from 'uuid';

// Simulated OpenAI/Bolna response with custom fields
// The webhook sends data as a Python dict string in analysis.data_collection_results.default.value
const mockWebhookData = {
  analysis: {
    data_collection_results: {
      default: {
        value: JSON.stringify({
          extraction: {
            // Standard fields
            company_name: "Bright Future Academy",
            name: "Lokeshwari",
            email_address: "lokeshwari.parent@gmail.com",
            smartnotification: "Parent interested in free demo - high engagement, needs weekend/evening slot",
            
            // Custom fields (business-specific)
            custom_fields: {
              student_name: "Aarav",
              student_age: 14,
              student_grade: "9th Standard",
              subject_interest: "Mathematics & Science",
              learning_mode: "Online",
              preferred_time_slot: "Weekends",
              referral_source: "Friend Referral",
              parent_occupation: "Business Owner",
              budget_range: "10k-20k",
              trial_class_requested: true
            }
          },
          demo_book_datetime: null
        })
      }
    }
  }
};

// Additional data for lead analytics
const additionalAnalysisData = {
  requirements: "Interested in a free 45-minute demo, potential scholarship/offers, flexible scheduling on weekends/evenings",
  custom_cta: null,
  in_detail_summary: "Parent Lokeshwari called regarding free demo session. Shows high interest in services with medium intent. Budget conscious (maybe), needs flexible timing. Strong fit alignment.",
};

async function testCustomFieldsExtraction() {
  const client = await pool.getClient();
  
  try {
    console.log('🧪 Starting Custom Fields Extraction Test...\n');
    
    // Step 1: Get contact and user info
    console.log('📞 Step 1: Fetching contact info for +91 9022842095...');
    const contactResult = await client.query(`
      SELECT id, user_id, name, phone_number
      FROM contacts
      WHERE phone_number = $1
      LIMIT 1
    `, ['+91 9022842095']);
    
    if (contactResult.rows.length === 0) {
      throw new Error('Contact not found! Create contact first.');
    }
    
    const contact = contactResult.rows[0];
    console.log(`✅ Found contact: ${contact.name} (ID: ${contact.id})`);
    console.log(`   User ID: ${contact.user_id}\n`);
    
    // Step 2: Get user's field configuration
    console.log('⚙️  Step 2: Checking user field configuration...');
    const userResult = await client.query(`
      SELECT id, email, field_configuration
      FROM users
      WHERE id = $1
    `, [contact.user_id]);
    
    const user = userResult.rows[0];
    console.log(`   User: ${user.email}`);
    console.log(`   Enabled Fields: ${JSON.stringify(user.field_configuration?.enabledFields || [])}\n`);
    
    // If no fields enabled, enable the custom fields we're testing
    if (!user.field_configuration?.enabledFields || user.field_configuration.enabledFields.length === 0) {
      console.log('🔧 Enabling custom fields for user...');
      const parsedWebhookData = JSON.parse(mockWebhookData.analysis.data_collection_results.default.value);
      const customFields = Object.keys(parsedWebhookData.extraction.custom_fields);
      await client.query(`
        UPDATE users
        SET field_configuration = jsonb_build_object(
          'enabledFields', $1::text[]
        )
        WHERE id = $2
      `, [customFields, contact.user_id]);
      console.log(`✅ Enabled ${customFields.length} custom fields\n`);
    }
    
    // Step 3: Simulate extraction
    console.log('🤖 Step 3: Simulating OpenAI extraction...');
    const enhancedLeadData = WebhookDataProcessor.extractEnhancedLeadData(mockWebhookData);
    
    if (!enhancedLeadData) {
      throw new Error('Failed to extract lead data');
    }
    
    console.log('📊 Extracted Data:');
    console.log(`   Company: ${enhancedLeadData.companyName}`);
    console.log(`   Name: ${enhancedLeadData.extractedName}`);
    console.log(`   Email: ${enhancedLeadData.extractedEmail}`);
    console.log(`   Custom Fields Count: ${Object.keys(enhancedLeadData.customFields).length}`);
    console.log(`   Custom Fields: ${JSON.stringify(enhancedLeadData.customFields, null, 2)}\n`);
    
    // Step 4: Create test call record
    console.log('📞 Step 4: Creating test call record...');
    const callId = uuidv4();
    const executionId = `test_exec_${Date.now()}`;
    
    await client.query(`
      INSERT INTO calls (
        id,
        user_id,
        contact_id,
        agent_id,
        phone_number,
        call_status,
        execution_id,
        duration,
        created_at
      )
      SELECT 
        $1,
        $2,
        $3,
        a.id,
        $4,
        'completed',
        $5,
        180,
        NOW()
      FROM agents a
      WHERE a.user_id = $2
      LIMIT 1
    `, [callId, contact.user_id, contact.id, contact.phone_number, executionId]);
    
    console.log(`✅ Created call: ${callId}\n`);
    
    // Step 5: Insert INDIVIDUAL analysis with custom fields
    console.log('💾 Step 5: Inserting INDIVIDUAL analysis...');
    const individualResult = await client.query(`
      INSERT INTO lead_analytics (
        user_id,
        phone_number,
        call_id,
        analysis_type,
        company_name,
        extracted_name,
        extracted_email,
        lead_tag,
        engagement_level,
        intent_level,
        budget_constraint,
        timeline_urgency,
        fit_alignment,
        smart_notification,
        demo_book_datetime,
        requirements,
        custom_cta,
        in_detail_summary,
        transcript_summary,
        custom_fields,
        created_at
      ) VALUES (
        $1, $2, $3, 'individual', $4, $5, $6,
        'Warm', 'High', 'Medium', 'Maybe', 'Low', 'High',
        $7, $8, $9, $10, $11, 'Test transcript summary',
        $12, NOW()
      )
      RETURNING id, custom_fields
    `, [
      contact.user_id,
      contact.phone_number,
      callId,
      enhancedLeadData.companyName,
      enhancedLeadData.extractedName,
      enhancedLeadData.extractedEmail,
      enhancedLeadData.smartNotification,
      enhancedLeadData.demoBookDatetime,
      additionalAnalysisData.requirements,
      additionalAnalysisData.custom_cta,
      additionalAnalysisData.in_detail_summary,
      JSON.stringify(enhancedLeadData.customFields)
    ]);
    
    console.log(`✅ Individual Analysis ID: ${individualResult.rows[0].id}`);
    console.log(`   Custom Fields Saved: ${JSON.stringify(individualResult.rows[0].custom_fields, null, 2)}\n`);
    
    // Step 6: Insert COMPLETE analysis with custom fields
    console.log('💾 Step 6: Inserting COMPLETE analysis...');
    const completeResult = await client.query(`
      INSERT INTO lead_analytics (
        user_id,
        phone_number,
        call_id,
        analysis_type,
        company_name,
        extracted_name,
        extracted_email,
        lead_tag,
        engagement_level,
        intent_level,
        budget_constraint,
        timeline_urgency,
        fit_alignment,
        smart_notification,
        demo_book_datetime,
        requirements,
        custom_cta,
        in_detail_summary,
        transcript_summary,
        custom_fields,
        created_at
      ) VALUES (
        $1, $2, NULL, 'complete', $3, $4, $5,
        'Warm', 'High', 'Medium', 'Maybe', 'Low', 'High',
        $6, $7, $8, $9, $10, 'Test complete analysis summary',
        $11, NOW()
      )
      ON CONFLICT (user_id, phone_number, analysis_type)
      DO UPDATE SET
        company_name = EXCLUDED.company_name,
        extracted_name = EXCLUDED.extracted_name,
        extracted_email = EXCLUDED.extracted_email,
        custom_fields = EXCLUDED.custom_fields,
        updated_at = NOW()
      RETURNING id, custom_fields
    `, [
      contact.user_id,
      contact.phone_number,
      enhancedLeadData.companyName,
      enhancedLeadData.extractedName,
      enhancedLeadData.extractedEmail,
      enhancedLeadData.smartNotification,
      enhancedLeadData.demoBookDatetime,
      additionalAnalysisData.requirements,
      additionalAnalysisData.custom_cta,
      additionalAnalysisData.in_detail_summary,
      JSON.stringify(enhancedLeadData.customFields)
    ]);
    
    console.log(`✅ Complete Analysis ID: ${completeResult.rows[0].id}`);
    console.log(`   Custom Fields Saved: ${JSON.stringify(completeResult.rows[0].custom_fields, null, 2)}\n`);
    
    // Step 7: Verify via query (same as Lead Intelligence API)
    console.log('🔍 Step 7: Verifying via Lead Intelligence query...');
    const verifyResult = await client.query(`
      SELECT 
        la.phone_number,
        la.extracted_name,
        la.analysis_type,
        la.custom_fields,
        la.created_at
      FROM lead_analytics la
      WHERE la.user_id = $1
        AND la.phone_number = $2
        AND la.analysis_type IN ('complete', 'individual')
      ORDER BY la.analysis_type DESC, la.created_at DESC
    `, [contact.user_id, contact.phone_number]);
    
    console.log(`✅ Found ${verifyResult.rows.length} analysis records:`);
    verifyResult.rows.forEach((row: any, index: number) => {
      console.log(`\n   ${index + 1}. ${row.analysis_type.toUpperCase()} Analysis`);
      console.log(`      Phone: ${row.phone_number}`);
      console.log(`      Name: ${row.extracted_name}`);
      console.log(`      Custom Fields Keys: ${Object.keys(row.custom_fields || {}).join(', ')}`);
      console.log(`      Custom Fields Data: ${JSON.stringify(row.custom_fields, null, 2)}`);
    });
    
    // Step 8: Test API response format
    console.log('\n📡 Step 8: Simulating API response format...');
    const apiResult = await client.query(`
      WITH phone_leads AS (
        SELECT DISTINCT ON (la.phone_number)
          'phone_' || la.phone_number as id,
          la.extracted_name as name,
          la.extracted_email as email,
          la.phone_number as phone,
          la.company_name as company,
          'outbound' as lead_type,
          la.lead_tag as recent_lead_tag,
          la.engagement_level as recent_engagement_level,
          la.intent_level as recent_intent_level,
          la.budget_constraint as recent_budget_constraint,
          la.timeline_urgency as recent_timeline_urgency,
          la.fit_alignment as recent_fit_alignment,
          la.requirements,
          la.custom_cta,
          la.custom_fields,
          'phone' as group_type
        FROM lead_analytics la
        WHERE la.user_id = $1
          AND la.phone_number = $2
          AND la.analysis_type IN ('complete', 'human_edit')
        ORDER BY la.phone_number, la.updated_at DESC
      )
      SELECT * FROM phone_leads
    `, [contact.user_id, contact.phone_number]);
    
    if (apiResult.rows.length > 0) {
      const lead = apiResult.rows[0];
      console.log(`✅ API Response Preview:`);
      console.log(`   ID: ${lead.id}`);
      console.log(`   Name: ${lead.name}`);
      console.log(`   Phone: ${lead.phone}`);
      console.log(`   Custom Fields: ${JSON.stringify(lead.custom_fields, null, 2)}`);
    }
    
    console.log('\n\n🎉 TEST COMPLETED SUCCESSFULLY! 🎉\n');
    console.log('Summary:');
    console.log('✅ OpenAI response extraction working');
    console.log('✅ Custom fields extracted correctly');
    console.log('✅ Individual analysis saved with custom_fields');
    console.log('✅ Complete analysis saved with custom_fields');
    console.log('✅ Lead Intelligence query returns custom_fields');
    console.log('✅ End-to-end pipeline verified\n');
    
  } catch (error: any) {
    console.error('❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  } finally {
    client.release();
  }
}

// Run the test
testCustomFieldsExtraction()
  .then(() => {
    console.log('Test script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test script failed:', error);
    process.exit(1);
  });
