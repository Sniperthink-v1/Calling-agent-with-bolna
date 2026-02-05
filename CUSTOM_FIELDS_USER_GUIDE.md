# Custom Fields Configuration - Complete User Guide

**Date**: February 5, 2026  
**Status**: ✅ Ready to Use

## Overview

The Custom Fields system allows you to configure which data fields should be extracted from call transcripts for each user. You have **26 pre-defined fields** organized by categories that cover all MSME business types.

---

## 📋 How to Assign Fields to a User

### Step 1: Navigate to Custom Fields
1. Login as **Super Admin**
2. Go to **Admin Panel** → **User Management**
3. Click the **"Custom Fields"** tab (Database icon)

### Step 2: Select User
1. Click the **"Select User"** dropdown
2. Choose a user from the list (shows email, name, status badge)
3. The system will:
   - Load the 26 available fields from the library
   - Load the user's current field configuration (if any)
   - Display fields grouped by category

### Step 3: Select Fields
You'll see fields organized in **7 categories**:

#### 📌 WHO (9 fields)
- Company / Lead Name ✅ CORE
- Phone Number ✅ CORE
- Email ✅ CORE
- Student Name
- Student Age / Grade
- Course / Program Requested
- Industry of Lead (dropdown)
- Lead Role / Designation
- Address of Lead

#### 📌 WHAT (4 fields)
- Product / Service Requested ✅ CORE
- Product / Service Category
- Offering Mix (dropdown)
- Quantity / Seats / Covers

#### 📌 HOW MUCH (2 fields)
- Budget Range (dropdown)
- Payment Terms Preference (dropdown)

#### 📌 WHERE (2 fields)
- Delivery / Visit Location
- Number of People

#### 📌 WHEN (2 fields)
- Delivery / Appointment Date
- Delivery / Visit Time

#### 📌 HOW (3 fields)
- Special Requirements
- On-Site Visit Required (boolean)
- Preferred Communication Mode (dropdown)

#### 📌 SO WHAT (4 fields)
- Existing Provider Mentioned (boolean)
- Repeat Customer (boolean)
- Referral Source (dropdown)
- Quotation / Booking Requested (boolean)

**✅ CORE fields**: Already extracted by default system logic  
**Regular fields**: Custom extraction via OpenAI

### Step 4: Check/Uncheck Fields
- **Click the checkbox** next to any field to enable/disable it
- Each field shows:
  - **Label**: Display name
  - **Extraction Hint**: What the AI should look for in conversations
- **Recommendation**: Select 4-5 fields relevant to the user's business

**Example for Manufacturing Business:**
- ✅ Product / Service Requested
- ✅ Budget Range
- ✅ Quantity / Seats / Covers
- ✅ Delivery Date
- ✅ Quotation Requested

**Example for Salon & Beauty:**
- ✅ Product / Service Requested
- ✅ Delivery / Appointment Date
- ✅ On-Site Visit Required
- ✅ Special Requirements
- ✅ Repeat Customer

### Step 5: Save Configuration
1. Click **"Save Configuration"** button
2. System sends: `PUT /api/admin/users/{userId}/field-configuration`
3. Payload: `{ enabled_fields: ["company_name", "email", "budget_range", ...] }`
4. Backend saves to: `users.field_configuration` (JSONB column)
5. Success toast appears

---

## 🤖 Generate OpenAI Extraction JSON

After saving field configuration:

### Step 1: Generate JSON
1. Click **"Generate Extraction JSON"** button
2. System calls: `POST /api/admin/users/{userId}/generate-extraction-json`
3. Backend creates a structured JSON prompt with:
   - User's enabled fields
   - Field types (text, number, boolean, dropdown, etc.)
   - Extraction hints for each field
   - Example responses

### Step 2: Copy to Clipboard
1. Click **"Copy to Clipboard"** button
2. JSON is copied with proper formatting

### Step 3: Configure OpenAI Platform
1. Go to **OpenAI Platform** → **Structured Outputs**
2. Paste the generated JSON schema
3. AI will now extract these exact fields from call transcripts

---

## 🔄 How It Works End-to-End

### 1. Call Happens
```
User → Bolna.ai → AI Call → Transcript Generated → Webhook to Backend
```

### 2. Webhook Processing (5 stages)
```
Stage 1: initiated
Stage 2: ringing
Stage 3: in-progress
Stage 4: call-disconnected ← TRANSCRIPT ARRIVES
Stage 5: completed ← RECORDING URL
```

### 3. OpenAI Extraction (Stage 4)
```typescript
// Backend sends transcript to OpenAI with user's custom field schema
const analysis = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    { role: "system", content: "Extract these fields from call transcript..." },
    { role: "user", content: transcript }
  ],
  response_format: { type: "json_object", schema: userFieldSchema }
});
```

### 4. Data Storage
```sql
-- Saved to lead_analytics table
UPDATE lead_analytics
SET custom_fields = {
  "budget_range": "₹20,000 - ₹50,000",
  "delivery_date": "2026-02-15",
  "quantity": 5,
  "quotation_requested": true
}
WHERE user_id = '...' AND phone_number = '+91 9876543210';
```

### 5. Dashboard Display
- Admin can view extracted custom fields in **Analytics Dashboard**
- Export leads with custom field data
- Filter and sort by custom fields

---

## 📊 Database Schema

### `users` table
```sql
field_configuration JSONB {
  "enabled_fields": ["company_name", "email", "budget_range"],
  "field_definitions": [
    {
      "key": "company_name",
      "label": "Company / Lead Name",
      "type": "text",
      "category": "WHO",
      "extraction_hint": "Extract the company name..."
    }
  ]
}
```

### `lead_analytics` table
```sql
custom_fields JSONB {
  "budget_range": "₹20,000 - ₹50,000",
  "delivery_date": "2026-02-15",
  "quantity": 5,
  "quotation_requested": true
}
```

---

## 🚀 API Reference

### 1. Get Field Library
```http
GET /api/admin/field-library

Response:
{
  "total": 26,
  "categories": ["WHO", "WHAT", "HOW MUCH", "WHERE", "WHEN", "HOW", "SO WHAT"],
  "fieldsByCategory": { ... },
  "allFields": [ ... ]
}
```

### 2. Get User Field Configuration
```http
GET /api/admin/users/:userId/field-configuration

Response:
{
  "userId": "...",
  "email": "user@example.com",
  "fieldConfiguration": {
    "enabled_fields": ["company_name", "email", "budget_range"],
    "field_definitions": [ ... ]
  }
}
```

### 3. Update User Field Configuration
```http
PUT /api/admin/users/:userId/field-configuration

Body:
{
  "enabled_fields": ["company_name", "email", "budget_range"]
}

Response:
{
  "message": "Field configuration updated successfully"
}
```

### 4. Generate Extraction JSON
```http
POST /api/admin/users/:userId/generate-extraction-json

Response:
{
  "extractionJSON": {
    "type": "object",
    "properties": {
      "budget_range": {
        "type": "string",
        "enum": ["< ₹5,000", "₹5,000 - ₹20,000", ...],
        "description": "Identify the budget range..."
      }
    },
    "required": ["budget_range"]
  }
}
```

### 5. Get Leads with Custom Fields
```http
GET /api/admin/leads-with-custom-fields?userId={userId}

Response:
{
  "leads": [
    {
      "company_name": "ABC Corp",
      "phone_number": "+91 9876543210",
      "custom_fields": {
        "budget_range": "₹20,000 - ₹50,000",
        "quotation_requested": true
      }
    }
  ]
}
```

---

## ⚠️ Important Notes

### Field Library is Pre-Defined
- You **CANNOT add new fields** dynamically through UI
- The 26 fields are defined in `backend/src/config/fieldLibrary.ts`
- To add a new field, you must:
  1. Edit `fieldLibrary.ts`
  2. Add field definition with key, label, type, category, extraction_hint
  3. Restart backend server
  4. New field will appear in UI automatically

### Core Fields vs Custom Fields
- **CORE fields** (company_name, phone_number, email, requirements): Always extracted by existing system logic
- **CUSTOM fields**: Only extracted if enabled for that user
- You can still enable core fields - they'll be included in the JSON schema

### Multi-Tenant Data Isolation
- Each user has their own `field_configuration`
- Lead analytics are stored per `user_id`
- Data is isolated - User A cannot see User B's configurations

### Field Types Supported
- `text` - Free text extraction
- `number` - Numeric values
- `phone` - Phone number format
- `email` - Email address format
- `date` - Date format (YYYY-MM-DD)
- `boolean` - true/false
- `dropdown` - Predefined options (enum)

---

## 🧪 Testing Checklist

- [ ] Login as Super Admin
- [ ] Navigate to User Management → Custom Fields tab
- [ ] Select a user from dropdown
- [ ] Verify 26 fields display grouped by 7 categories
- [ ] Check/uncheck 4-5 fields
- [ ] Click "Save Configuration"
- [ ] Verify success toast appears
- [ ] Refresh page - selections should persist
- [ ] Click "Generate Extraction JSON"
- [ ] Verify JSON contains selected fields with proper schema
- [ ] Click "Copy to Clipboard"
- [ ] Paste in text editor - verify valid JSON
- [ ] Make a test call with that user's agent
- [ ] Check lead_analytics table - custom_fields should be populated
- [ ] View lead in Analytics Dashboard - custom fields should display

---

## 🐛 Troubleshooting

### Fields not displaying
- **Check**: Backend server is running
- **Check**: API endpoint `/api/admin/field-library` returns 200
- **Check**: Browser console for errors
- **Fix**: Restart backend server

### Save fails with 400 error
- **Cause**: Invalid field keys in enabled_fields array
- **Fix**: Ensure all selected field keys exist in FIELD_LIBRARY

### Custom fields not populating after call
- **Check**: OpenAI API key is configured
- **Check**: User has field configuration saved
- **Check**: Webhook Stage 4 (call-disconnected) is being received
- **Fix**: Check backend logs for OpenAI extraction errors

### JSON generation fails
- **Cause**: User has no enabled fields
- **Fix**: Select at least 1 field and save configuration first

---

## 📁 Related Files

### Frontend
- `Frontend/src/components/admin/UserManagement/CustomFieldsConfiguration.tsx` - Main UI component
- `Frontend/src/services/apiService.ts` - API client methods
- `Frontend/src/config/api.ts` - API endpoint definitions
- `Frontend/src/types/admin.ts` - TypeScript types

### Backend
- `backend/src/config/fieldLibrary.ts` - 26 field definitions
- `backend/src/controllers/fieldConfigurationController.ts` - 6 API endpoints
- `backend/src/services/openaiExtractionService.ts` - OpenAI extraction logic
- `backend/src/services/webhookService.ts` - Webhook processing
- `backend/src/models/LeadAnalytics.ts` - Database model

---

## 🎯 Quick Start

**For Admins:**
1. User Management → Custom Fields → Select User → Check 4-5 fields → Save
2. Generate JSON → Copy → Configure in OpenAI Platform
3. Done! Custom fields will now be extracted from all calls for that user

**For Developers:**
1. Field library in `backend/src/config/fieldLibrary.ts`
2. To add new field: Add to FIELD_LIBRARY array, restart backend
3. Frontend automatically displays new fields
4. No schema migrations needed (JSONB columns are flexible)

---

## 🔮 Future Enhancements

- [ ] Bulk field assignment (apply config to multiple users at once)
- [ ] Field templates by industry (Manufacturing, Salon, Education, etc.)
- [ ] Custom field creation through UI (without editing code)
- [ ] Field validation rules (min/max length, regex patterns)
- [ ] Field dependencies (if field A is enabled, enable field B)
- [ ] Field usage statistics (most used fields across all users)
- [ ] A/B testing different field combinations
- [ ] Field-level analytics (which fields improve conversion rates)

---

**End of Guide** ✅
