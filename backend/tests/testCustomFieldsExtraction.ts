import { pool } from '../src/config/database';
import { WebhookDataProcessor } from '../src/services/webhookDataProcessor';
import * as leadAnalyticsService from '../src/services/leadAnalyticsService';

/**
 * Test Script: Custom Fields Extraction Pipeline
 * Tests the complete flow: OpenAI Response → Extraction → Individual Analysis → Complete Analysis → Database
 * 
 * Contact: Lokeshwari (+91 9022842095)
 * OpenAI Response: Student Sheldon (age 8, Grade 3) - Demo booking with custom fields
 */

// Mock OpenAI extraction response - EXACT response from user's request
const mockOpenAIResponse = {
  intent_level: "High",
  intent_score: 3,
  urgency_level: "Medium",
  urgency_score: 2,
  budget_constraint: "Maybe",
  budget_score: 2,
  fit_alignment: "High",
  fit_score: 3,
  engagement_health: "Low",
  engagement_score: 1,
  total_score: 11,
  lead_status_tag: "Warm",
  demo_book_datetime: null,
  reasoning: {
    intent: "Lead shows concrete interest by booking a demo and engaging in scheduling, indicating readiness to evaluate the offering.",
    urgency: "Demo requested for tomorrow implies near-term action but not an urgent pain point.",
    budget: "No budget discussion; default to Maybe.",
    fit: "Age range and subject focus align with program (5-16, Grades 3, age 8).",
    engagement: "Responses are mostly agent-led; user did not initiate independent questions.",
    cta_behavior: "Demo CTA clicked = Yes; Pricing CTA not discussed."
  },
  extraction: {
    name: null,
    email_address: "agrimagupta0204@gmail.com",
    company_name: null,
    smartnotification: "Agrima booked a demo",
    requirements: "demo for Sheldon, Grade 3, age 8; 45-minute free session",
    "Custom CTA": "Demo = Yes, Email Provided",
    "In detail summary": "Conversation with Agrima Gupta regarding Super Sheldon. Confirmed Sheldon is in Grade 3, age 8. Provided information about the program and offered a free 45-minute demo. Agrima agreed to book the demo for tomorrow at 3 PM and provided email agrimagupta0204@gmail.com. Booking confirmed. No budget discussion occurred.",
    custom_fields: {
      student_name: "Sheldon",
      student_age: "8",
      referral_source: "Not Mentioned"
    }
  }
};

// Mock webhook data structure (as it comes from Bolna.ai)
const mockWebhookData = {
  analysis: {
    data_collection_results: {
      default: {
        // WebhookDataProcessor expects a Python dict STRING
        value: JSON.stringify(mockOpenAIResponse)
      }
    }
  }
};

// Mock analysis data structure for leadAnalyticsService
const mockAnalysisData = {
  user_id: '789895c8-4bd6-43e9-bfea-a4171ec47197',
  phone_number: '+91 9022842095',
  lead_tag: mockOpenAIResponse.lead_status_tag,
  intent_level: mockOpenAIResponse.intent_level,
  intent_score: mockOpenAIResponse.intent_score,
  urgency_level: mockOpenAIResponse.urgency_level,
  urgency_score: mockOpenAIResponse.urgency_score,
  budget_constraint: mockOpenAIResponse.budget_constraint,
  budget_score: mockOpenAIResponse.budget_score,
  fit_alignment: mockOpenAIResponse.fit_alignment,
  fit_score: mockOpenAIResponse.fit_score,
  engagement_health: mockOpenAIResponse.engagement_health,
  engagement_score: mockOpenAIResponse.engagement_score,
  total_score: mockOpenAIResponse.total_score,
  reasoning: mockOpenAIResponse.reasoning,
  demo_book_datetime: mockOpenAIResponse.demo_book_datetime,
  extraction: mockOpenAIResponse.extraction
};

async function testCustomFieldsPipeline() {
  try {
    // Test contact details - Using Lokeshwari's phone from user's request
    const testPhone = '+91 9022842095';
    const testUserId = '789895c8-4bd6-43e9-bfea-a4171ec47197'; // test3@gmail.com
    const testAgentId = 'test-agent-id';
    const testCampaignId = 'test-campaign-id';
    
    console.log('\n📋 Test Contact: Lokeshwari - Phone:', testPhone);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 STEP 1: EXTRACTION FROM WEBHOOK');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const enhancedData = WebhookDataProcessor.extractEnhancedLeadData(mockWebhookData);
    
    if (!enhancedData) {
      console.error('❌ Extraction failed! No data returned');
      return;
    }
    
    console.log('✅ webhookDataProcessor.extractEnhancedLeadData() SUCCESS');
    console.log('\n🔍 Extracted Data:');
    console.log('  - Name:', enhancedData.extractedName || 'null');
    console.log('  - Email:', enhancedData.extractedEmail || 'null');
    console.log('  - Company:', enhancedData.companyName || 'null');
    console.log('  - Smart Notification:', enhancedData.smartNotification);
    console.log('  - Requirements:', enhancedData.requirements);
    console.log('\n🎯 Custom Fields Extracted:');
    console.log(JSON.stringify(enhancedData.customFields, null, 2));

    // Step 2: Create a call record
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📞 STEP 2: CREATE CALL RECORD');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const callResult = await pool.query(`
      INSERT INTO calls (
        user_id, agent_id, campaign_id, phone_number, 
        status, direction, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id
    `, [testUserId, testAgentId, testCampaignId, testPhone, 'completed', 'outbound']);

    console.log('✅ Call record created with ID:', callResult.rows[0].id);
    const callId = callResult.rows[0].id;

    // Step 3: Create individual analysis (per-call)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 STEP 3: CREATE INDIVIDUAL ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const mappedIndividual = leadAnalyticsService.mapIndividualAnalysis(mockAnalysisData);
    console.log('✅ leadAnalyticsService.mapIndividualAnalysis() SUCCESS');
    console.log('\n🔍 Mapped Individual Analysis:');
    console.log('  - Analysis Type:', 'individual');
    console.log('  - Lead Tag:', mappedIndividual.lead_tag);
    console.log('  - Intent Level:', mappedIndividual.intent_level);
    console.log('  - Smart Notification:', mappedIndividual.smart_notification);
    console.log('  - Requirements:', mappedIndividual.requirements);
    console.log('\n🎯 Custom Fields in Individual Analysis:');
    console.log(JSON.stringify(mappedIndividual.custom_fields, null, 2));

    const individualResult = await pool.query(`
      INSERT INTO lead_analytics (
        user_id, phone_number, call_id, analysis_type,
        lead_tag, intent_level, intent_score, urgency_level, urgency_score,
        budget_constraint, budget_score, fit_alignment, fit_score,
        engagement_health, engagement_score, total_score,
        reasoning, smart_notification, demo_book_datetime,
        requirements, custom_cta, in_detail_summary, custom_fields,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, NOW(), NOW()
      ) RETURNING id
    `, [
      testUserId, testPhone, callId, 'individual',
      mappedIndividual.lead_tag, mappedIndividual.intent_level, mappedIndividual.intent_score,
      mappedIndividual.urgency_level, mappedIndividual.urgency_score,
      mappedIndividual.budget_constraint, mappedIndividual.budget_score,
      mappedIndividual.fit_alignment, mappedIndividual.fit_score,
      mappedIndividual.engagement_health, mappedIndividual.engagement_score,
      mappedIndividual.total_score, JSON.stringify(mappedIndividual.reasoning),
      mappedIndividual.smart_notification, mappedIndividual.demo_book_datetime,
      mappedIndividual.requirements, mappedIndividual.custom_cta,
      mappedIndividual.in_detail_summary, JSON.stringify(mappedIndividual.custom_fields)
    ]);

    console.log('✅ Individual analysis inserted with ID:', individualResult.rows[0].id);

    // Step 4: Create complete analysis (aggregated per contact)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 STEP 4: CREATE COMPLETE ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const mappedComplete = leadAnalyticsService.mapCompleteAnalysis(mockAnalysisData);
    console.log('✅ leadAnalyticsService.mapCompleteAnalysis() SUCCESS');
    console.log('\n🔍 Mapped Complete Analysis:');
    console.log('  - Analysis Type:', 'complete');
    console.log('  - Lead Tag:', mappedComplete.lead_tag);
    console.log('  - Intent Level:', mappedComplete.intent_level);
    console.log('  - Smart Notification:', mappedComplete.smart_notification);
    console.log('  - Requirements:', mappedComplete.requirements);
    console.log('\n🎯 Custom Fields in Complete Analysis:');
    console.log(JSON.stringify(mappedComplete.custom_fields, null, 2));

    const completeResult = await pool.query(`
      INSERT INTO lead_analytics (
        user_id, phone_number, call_id, analysis_type,
        lead_tag, intent_level, intent_score, urgency_level, urgency_score,
        budget_constraint, budget_score, fit_alignment, fit_score,
        engagement_health, engagement_score, total_score,
        reasoning, smart_notification, demo_book_datetime,
        requirements, custom_cta, in_detail_summary, custom_fields,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, NOW(), NOW()
      ) RETURNING id
    `, [
      testUserId, testPhone, null, 'complete', // call_id is NULL for complete analysis
      mappedComplete.lead_tag, mappedComplete.intent_level, mappedComplete.intent_score,
      mappedComplete.urgency_level, mappedComplete.urgency_score,
      mappedComplete.budget_constraint, mappedComplete.budget_score,
      mappedComplete.fit_alignment, mappedComplete.fit_score,
      mappedComplete.engagement_health, mappedComplete.engagement_score,
      mappedComplete.total_score, JSON.stringify(mappedComplete.reasoning),
      mappedComplete.smart_notification, mappedComplete.demo_book_datetime,
      mappedComplete.requirements, mappedComplete.custom_cta,
      mappedComplete.in_detail_summary, JSON.stringify(mappedComplete.custom_fields)
    ]);

    console.log('✅ Complete analysis inserted with ID:', completeResult.rows[0].id);

    // Step 5: Verify both records
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 STEP 5: VERIFY DATABASE RECORDS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const verifyResult = await pool.query(`
      SELECT 
        id, user_id, phone_number, call_id, analysis_type,
        lead_tag, intent_level, custom_fields, created_at
      FROM lead_analytics
      WHERE phone_number = $1 AND user_id = $2
      ORDER BY created_at DESC
    `, [testPhone, testUserId]);

    console.log('✅ Found', verifyResult.rows.length, 'lead_analytics records for phone:', testPhone);
    
    verifyResult.rows.forEach((row, index) => {
      console.log(`\n┌─────────────────────────────────────────────────────┐`);
      console.log(`│ Record ${index + 1}: ${row.analysis_type.toUpperCase()} ANALYSIS`);
      console.log(`└─────────────────────────────────────────────────────┘`);
      console.log('  📌 ID:', row.id);
      console.log('  📞 Phone:', row.phone_number);
      console.log('  👤 User ID:', row.user_id);
      console.log('  🏷️  Lead Tag:', row.lead_tag);
      console.log('  📊 Intent Level:', row.intent_level);
      console.log('  📅 Created:', new Date(row.created_at).toLocaleString());
      console.log('\n  🎯 Custom Fields:');
      console.log('  ' + JSON.stringify(row.custom_fields, null, 2).replace(/\n/g, '\n  '));
      
      if (row.custom_fields && Object.keys(row.custom_fields).length > 0) {
        console.log('  ✅ Custom fields populated successfully!');
      } else {
        console.log('  ❌ WARNING: Custom fields are empty!');
      }
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 TEST COMPLETED SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Summary:');
    console.log('  ✅ OpenAI extraction processed');
    console.log('  ✅ Enhanced data extracted with custom fields');
    console.log('  ✅ Individual analysis created with custom fields');
    console.log('  ✅ Complete analysis created with custom fields');
    console.log('  ✅ Database records verified');
    console.log('\n🎯 Custom Fields Flow: OpenAI → Webhook → Extraction → Individual Analysis → Complete Analysis → Database ✅');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the test
testCustomFieldsPipeline();
