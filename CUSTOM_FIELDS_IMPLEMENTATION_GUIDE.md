# Custom Fields Implementation Guide
**Lead Intelligence Custom Fields for Business-Specific Data Extraction**

## 📋 Overview

This system allows admins to configure custom fields for each user based on their business type. When a call is analyzed, OpenAI extracts both **core fields** (common across all businesses) and **custom fields** (specific to the user's business) from the conversation transcript.

### Key Concepts

1. **Core Fields**: Universal fields stored in dedicated `lead_analytics` columns (e.g., `company_name`, `phone_number`, `requirements`)
2. **Custom Fields**: Business-specific fields stored in `lead_analytics.custom_fields` JSONB column
3. **Field Library**: 23 pre-defined fields covering WHO, WHAT, HOW MUCH, WHERE, WHEN, HOW, SO WHAT
4. **Admin Configuration**: Admin selects relevant fields per user via admin panel
5. **OpenAI Integration**: Admin pastes generated JSON into OpenAI platform for extraction

---

## 🗂️ Field Mapping Reference

### Core Fields (Stored in Dedicated Columns)

These fields are **always extracted** and stored in their own database columns:

| CSV Column Name | Extraction Key | Database Column | Data Type | Notes |
|----------------|----------------|-----------------|-----------|-------|
| Company / Lead Name | `name` | `extracted_name` | VARCHAR(255) | Primary contact name |
| Phone Number | (from call data) | `phone_number` | VARCHAR(50) | Normalized: `+91 XXXXXXXXXX` |
| Email | `email_address` | `extracted_email` | VARCHAR(255) | Email if mentioned |
| Product / Service Requested | `requirements` | `requirements` | TEXT | Core business requirement |

### Custom Fields (Stored in JSONB)

These fields are **configured per user** and stored in `custom_fields` JSON:

| CSV Column Name | Field Key | Type | Category | Example Value |
|----------------|-----------|------|----------|---------------|
| Student Name | `student_name` | text | WHO | "Rahul Kumar" |
| Student Age / Grade | `student_age` | number | WHO | 15 |
| Course / Program Requested | `course_program` | text | WHO | "Python Bootcamp" |
| Industry of Lead | `industry` | dropdown | WHO | "Education" |
| Lead Role / Designation | `lead_role` | text | WHO | "Owner" |
| Address of Lead | `address` | text | WHO | "123 MG Road, Bangalore" |
| Product / Service Category | `product_category` | text | WHAT | "Branding" |
| Offering Mix | `offering_mix` | dropdown | WHAT | "Bundle (Product + Service)" |
| Quantity / Seats / Covers | `quantity` | number | WHAT | 12 |
| Budget Range | `budget_range` | dropdown | HOW MUCH | "₹20,000 - ₹50,000" |
| Payment Terms Preference | `payment_terms` | dropdown | HOW MUCH | "Advance Payment" |
| Delivery / Visit Location | `delivery_location` | text | WHERE | "Walk-in" |
| Delivery / Appointment Date | `delivery_date` | date | WHEN | "2026-02-15" |
| Delivery / Visit Time | `delivery_time` | text | WHEN | "2 PM" |
| Number of People | `number_of_people` | number | WHERE | 4 |
| Special Requirements | `special_requirements` | text | HOW | "Gluten-free" |
| On-Site Visit Required | `on_site_visit` | boolean | HOW | true |
| Preferred Communication Mode | `preferred_communication` | dropdown | HOW | "WhatsApp" |
| Existing Provider Mentioned | `existing_provider` | boolean | SO WHAT | true |
| Repeat Customer | `repeat_customer` | boolean | SO WHAT | false |
| Referral Source | `referral_source` | dropdown | SO WHAT | "Instagram" |
| Quotation / Booking Requested | `quotation_requested` | boolean | SO WHAT | true |

---

## 🔄 Data Flow

### 1. Admin Configuration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN PANEL WORKFLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: Admin opens User Settings                              │
│          ↓                                                      │
│  Step 2: Admin selects custom fields for user                   │
│          Examples:                                              │
│          ✓ student_age                                          │
│          ✓ course_program                                       │
│          ✓ industry                                             │
│          ✓ delivery_date                                        │
│          ↓                                                      │
│  Step 3: System saves to users.field_configuration              │
│          {                                                      │
│            "enabled_fields": ["student_age", "course_program"], │
│            "field_definitions": [...]                           │
│          }                                                      │
│          ↓                                                      │
│  Step 4: Admin clicks "Generate Extraction JSON"                │
│          ↓                                                      │
│  Step 5: System generates complete JSON structure               │
│          ↓                                                      │
│  Step 6: Admin copies JSON                                      │
│          ↓                                                      │
│  Step 7: Admin pastes JSON into OpenAI Platform                 │
│          (in user's system prompt configuration)                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Call Analysis & Extraction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    CALL ANALYSIS DATA FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Call ends → Bolna webhook (stage 4: call-disconnected)      │
│                                                                 │
│  2. webhookService.ts receives transcript                       │
│                                                                 │
│  3. openaiExtractionService.ts analyzes transcript              │
│     → OpenAI extracts using configured JSON structure           │
│                                                                 │
│  4. OpenAI Response:                                            │
│     {                                                           │
│       "extraction": {                                           │
│         "name": "John Doe",                                     │
│         "email_address": "john@example.com",                    │
│         "company_name": "Acme Corp",                            │
│         "requirements": "Logo design",                          │
│         "custom_fields": {                                      │
│           "student_age": 15,                    ← Custom        │
│           "course_program": "Python Bootcamp",  ← Custom        │
│           "industry": "Education"               ← Custom        │
│         }                                                       │
│       },                                                        │
│       "scores": {...}                                           │
│     }                                                           │
│                                                                 │
│  5. webhookDataProcessor.ts extracts data                       │
│     - Core fields → individual variables                        │
│     - custom_fields → nested object                             │
│                                                                 │
│  6. leadAnalyticsService.ts creates analytics record            │
│     INSERT INTO lead_analytics (                                │
│       extracted_name,           ← "John Doe"                    │
│       company_name,             ← "Acme Corp"                   │
│       requirements,             ← "Logo design"                 │
│       custom_fields             ← {student_age: 15, ...}        │
│     )                                                           │
│                                                                 │
│  7. Stored in database:                                         │
│     lead_analytics table:                                       │
│     ├── Core columns (queryable, indexed)                       │
│     └── custom_fields JSONB (flexible, GIN indexed)             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Extraction JSON Structure

**What admin pastes into OpenAI Platform:**

```json
{
  "extraction": {
    "name": "Extract full name of the contact (null if not mentioned)",
    "email_address": "Extract email address if mentioned (null if not mentioned)",
    "company_name": "Extract company or business name (null if not mentioned)",
    "smartnotification": "Generate a 4-5 word summary of the user interaction",
    "requirements": "Extract product or service requested (null if not mentioned)",
    "custom_cta": "Extract any custom call-to-action buttons clicked, separated by comma",
    "in_detail_summary": "Generate a detailed summary of the entire conversation",
    "custom_fields": {
      "student_age": "Extract the age or grade of the student from conversation [Type: number]",
      "course_program": "Extract the specific course or program the student/parent is interested in [Type: text]",
      "industry": "Identify which industry sector the lead belongs to [Type: dropdown, Options: Manufacturing, Salon & Beauty, IT & Software, Food & Beverage, Education, Healthcare, Retail, Real Estate, Other]",
      "delivery_date": "Extract the date when delivery or service is needed (format: YYYY-MM-DD). Examples: 2025-02-15, Today, This week [Type: date]"
    }
  }
}
```

---

## 🛠️ API Endpoints

### Admin Field Configuration API

#### 1. Get Field Library
```http
GET /api/admin/field-library
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "total": 23,
  "categories": ["WHO", "WHAT", "HOW MUCH", "WHERE", "WHEN", "HOW", "SO WHAT"],
  "fieldsByCategory": {
    "WHO": [
      {
        "key": "student_age",
        "label": "Student Age / Grade",
        "type": "number",
        "category": "WHO",
        "extraction_hint": "Extract the age or grade of the student from conversation",
        "core": false
      },
      ...
    ]
  }
}
```

#### 2. Get User's Field Configuration
```http
GET /api/admin/users/:userId/field-configuration
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "fieldConfiguration": {
    "enabled_fields": ["student_age", "course_program", "industry"],
    "field_definitions": [...]
  }
}
```

#### 3. Update User's Field Configuration
```http
PUT /api/admin/users/:userId/field-configuration
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "enabled_fields": ["student_age", "course_program", "industry", "delivery_date"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Field configuration updated successfully",
  "fieldConfiguration": {
    "enabled_fields": ["student_age", "course_program", "industry", "delivery_date"],
    "field_definitions": [...]
  }
}
```

#### 4. Generate Extraction JSON
```http
POST /api/admin/users/:userId/generate-extraction-json
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "userId": "uuid",
  "userEmail": "user@example.com",
  "enabledFields": ["student_age", "course_program"],
  "extractionJSON": {
    "extraction": {
      "name": "...",
      "custom_fields": {
        "student_age": "Extract the age...",
        "course_program": "Extract the course..."
      }
    }
  },
  "instructions": {
    "step1": "Copy the extractionJSON object below",
    "step2": "Open OpenAI Platform (https://platform.openai.com)",
    "step3": "Navigate to Prompts → User's System Prompt",
    "step4": "Paste this JSON in the extraction section",
    "step5": "Save the prompt in OpenAI platform"
  }
}
```

#### 5. Get Leads with Custom Fields (Testing)
```http
GET /api/admin/users/:userId/leads-with-custom-fields?limit=20&offset=0
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "userId": "uuid",
  "total": 20,
  "leads": [
    {
      "id": "uuid",
      "phone_number": "+91 9876543210",
      "company_name": "ABC Institute",
      "extracted_name": "Raj Kumar",
      "custom_fields": {
        "student_age": 15,
        "course_program": "Python Bootcamp",
        "industry": "Education"
      },
      "total_score": 85,
      "created_at": "2026-02-05T10:30:00Z"
    }
  ]
}
```

---

## 🗄️ Database Schema

### Table: `lead_analytics`

```sql
-- Custom fields column
custom_fields JSONB DEFAULT '{}'::jsonb

-- Example stored data:
{
  "student_age": 15,
  "course_program": "Python Bootcamp",
  "industry": "Education",
  "delivery_date": "2026-02-15",
  "on_site_visit": true,
  "quantity": 12
}

-- GIN index for efficient JSONB queries
CREATE INDEX idx_lead_analytics_custom_fields ON lead_analytics USING gin (custom_fields);
```

### Table: `users`

```sql
-- Field configuration column
field_configuration JSONB DEFAULT '{
  "enabled_fields": [],
  "field_definitions": []
}'::jsonb

-- Example stored data:
{
  "enabled_fields": [
    "student_age",
    "course_program",
    "industry"
  ],
  "field_definitions": [
    {
      "key": "student_age",
      "label": "Student Age",
      "type": "number",
      "category": "WHO",
      "extraction_hint": "Extract the age or grade of the student from conversation"
    },
    {
      "key": "course_program",
      "label": "Course / Program Requested",
      "type": "text",
      "category": "WHAT",
      "extraction_hint": "Extract the specific course or program the student/parent is interested in"
    }
  ]
}

-- GIN index for efficient JSONB queries
CREATE INDEX idx_users_field_configuration ON users USING gin (field_configuration);
```

---

## 📊 Querying Custom Fields

### Query by specific custom field
```sql
SELECT 
  id,
  phone_number,
  company_name,
  custom_fields->>'student_age' AS student_age,
  custom_fields->>'course_program' AS course_program,
  total_score
FROM lead_analytics
WHERE user_id = $1
  AND custom_fields->>'student_age' IS NOT NULL
  AND (custom_fields->>'student_age')::int BETWEEN 12 AND 18
ORDER BY created_at DESC;
```

### Query by multiple custom fields
```sql
SELECT *
FROM lead_analytics
WHERE user_id = $1
  AND analysis_type = 'complete'
  AND (
    custom_fields->>'industry' = 'Education'
    OR custom_fields->>'course_program' ILIKE '%Python%'
  )
ORDER BY total_score DESC;
```

### Check if custom field exists
```sql
SELECT *
FROM lead_analytics
WHERE user_id = $1
  AND custom_fields ? 'student_age'  -- Check if key exists
  AND custom_fields->>'student_age' IS NOT NULL;
```

---

## 🔍 Example Use Cases

### Education Business (Coaching Institute)
**Enabled Fields:**
- `student_age`
- `course_program`
- `delivery_date`
- `number_of_people`
- `quotation_requested`

**Sample Extraction:**
```json
{
  "custom_fields": {
    "student_age": 15,
    "course_program": "Python & Data Science Bootcamp",
    "delivery_date": "2026-03-01",
    "number_of_people": 1,
    "quotation_requested": true
  }
}
```

### Salon Business
**Enabled Fields:**
- `product_category` (Haircut, Coloring, Spa)
- `delivery_date` (Appointment date)
- `delivery_time` (Appointment time)
- `special_requirements` (Hair type, allergies)
- `repeat_customer`

**Sample Extraction:**
```json
{
  "custom_fields": {
    "product_category": "Hair Coloring",
    "delivery_date": "2026-02-10",
    "delivery_time": "3 PM",
    "special_requirements": "Sensitive scalp - need organic dye",
    "repeat_customer": true
  }
}
```

### Manufacturing Business
**Enabled Fields:**
- `industry`
- `quantity`
- `delivery_location`
- `payment_terms`
- `existing_provider`

**Sample Extraction:**
```json
{
  "custom_fields": {
    "industry": "Manufacturing",
    "quantity": 500,
    "delivery_location": "Factory - Pune",
    "payment_terms": "Net 30",
    "existing_provider": true
  }
}
```

---

## ✅ Testing Checklist

- [ ] Run migration: `1026_add_custom_fields_support.sql`
- [ ] Verify `lead_analytics.custom_fields` column exists
- [ ] Verify `users.field_configuration` column exists
- [ ] Test GET `/api/admin/field-library`
- [ ] Test PUT `/api/admin/users/:userId/field-configuration`
- [ ] Test POST `/api/admin/users/:userId/generate-extraction-json`
- [ ] Copy generated JSON → Paste in OpenAI Platform
- [ ] Make a test call → Verify custom fields extracted
- [ ] Query custom fields from `lead_analytics`
- [ ] Test JSONB queries (filtering, searching)

---

## 🚀 Deployment Steps

1. **Run Database Migration**
   ```bash
   npm run migrate
   # Applies 1026_add_custom_fields_support.sql
   ```

2. **Restart Backend Server**
   ```bash
   cd backend
   npm run build
   npm start
   ```

3. **Configure Fields for a User**
   - Open Admin Panel
   - Navigate to User Management
   - Select a user
   - Configure custom fields
   - Generate extraction JSON
   - Copy JSON

4. **Update OpenAI Prompt**
   - Open OpenAI Platform
   - Navigate to user's system prompt
   - Paste extraction JSON
   - Save prompt

5. **Test with Real Call**
   - Make a test call
   - Wait for webhook (stage 4)
   - Check `lead_analytics` table for `custom_fields` data

---

## 📝 Notes

- **Backward Compatibility**: Existing `lead_analytics` records will have `custom_fields = {}` (empty object)
- **Performance**: GIN indexes on JSONB columns ensure fast queries
- **Flexibility**: Admins can add custom field definitions beyond the 23 default fields
- **Multi-Tenant**: Each user can have different field configurations
- **Type Safety**: Field types are validated (text, number, date, boolean, dropdown)

---

## 🔗 Related Files

- **Migration**: `backend/src/migrations/1026_add_custom_fields_support.sql`
- **Field Library**: `backend/src/config/fieldLibrary.ts`
- **Controller**: `backend/src/controllers/fieldConfigurationController.ts`
- **Routes**: `backend/src/routes/admin.ts`
- **Models**: `backend/src/models/LeadAnalytics.ts`
- **Services**: 
  - `backend/src/services/openaiExtractionService.ts`
  - `backend/src/services/webhookDataProcessor.ts`
  - `backend/src/services/leadAnalyticsService.ts`
