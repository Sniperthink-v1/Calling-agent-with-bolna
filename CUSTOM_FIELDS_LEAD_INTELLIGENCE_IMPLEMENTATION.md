# Custom Fields in Lead Intelligence - Implementation Summary

## Overview
Custom fields configured in the Custom Fields Configuration panel now appear as dynamic columns in the Lead Intelligence table, showing business-specific data extracted from calls and chats.

## What Was Implemented

### 1. Backend Changes (`backend/src/controllers/leadIntelligenceController.ts`)

#### Added Imports
```typescript
import { FIELD_LIBRARY } from '../config/fieldLibrary';
```

#### Updated LeadGroup Interface
```typescript
export interface LeadGroup {
  // ... existing fields ...
  customFields?: Record<string, any>; // Custom business-specific fields from extraction
}
```

#### Modified `getLeadIntelligence()` Method

**Step 1: Fetch User's Field Configuration**
```typescript
const userResult = await this.pool.query(
  'SELECT field_configuration FROM users WHERE id = $1',
  [userId]
);
const enabledFields = userResult.rows[0]?.field_configuration?.enabledFields || [];
```

**Step 2: Added `custom_fields` Subqueries to CTEs**

- **phone_leads CTE**: Extracts custom_fields from latest complete/human_edit analysis or plivo_calls
```typescript
(
  SELECT cf.custom_fields
  FROM (
    SELECT la_latest.custom_fields::jsonb as custom_fields,
           la_latest.analysis_timestamp as ts
    FROM lead_analytics la_latest
    WHERE la_latest.user_id = $1
      AND la_latest.phone_number = plb.phone
      AND la_latest.analysis_type IN ('complete', 'human_edit')
    UNION ALL
    SELECT pc_latest.lead_complete_analysis->'extraction'->'custom_fields' as custom_fields,
           COALESCE(pc_latest.lead_extraction_completed_at, pc_latest.created_at) as ts
    FROM plivo_calls pc_latest
    WHERE pc_latest.user_id = $1
      AND pc_latest.to_phone_number = plb.phone
  ) cf
  ORDER BY cf.ts DESC
  LIMIT 1
)::jsonb as custom_fields
```

- **email_leads CTE**: Extracts custom_fields from most recent individual analysis
```typescript
(SELECT la_ind.custom_fields 
 FROM lead_analytics la_ind 
 JOIN calls c_ind ON la_ind.call_id = c_ind.id
 WHERE la_ind.user_id = $1 
   AND la_ind.extracted_email = elb.email 
   AND la_ind.analysis_type = 'individual'
 ORDER BY c_ind.created_at DESC 
 LIMIT 1)::jsonb as custom_fields
```

- **individual_leads CTE**: Gets custom_fields from lead_analytics directly
```typescript
la.custom_fields::jsonb as custom_fields
```

**Step 3: Added `custom_fields` to All UNION SELECT Statements**
```typescript
all_leads AS (
  SELECT 
    group_key, group_type, phone, email, name, company, lead_type,
    recent_lead_tag, recent_engagement_level, recent_intent_level,
    recent_budget_constraint, recent_timeline_urgency, recent_fit_alignment,
    escalated_to_human, last_contact, demo_book_datetime, lead_stage, contact_id, interactions,
    interacted_agents, requirements, custom_cta, custom_fields, contact_notes, rn, assigned_to_team_member_id
  FROM phone_leads
  UNION ALL
  -- ... same columns for email_leads and individual_leads
)
```

**Step 4: Map custom_fields in Result Transformation**
```typescript
const leadGroups: LeadGroup[] = result.rows.map((row, index) => ({
  // ... existing fields ...
  customFields: row.custom_fields || {}, // Custom business-specific fields from extraction
  // ... remaining fields ...
}));
```

**Step 5: Return Enabled Fields with Response**
```typescript
res.json({ 
  leadGroups, 
  enabledFields: enabledFields.map(key => {
    const field = FIELD_LIBRARY.find(f => f.key === key);
    return field ? { key: field.key, label: field.label, type: field.type } : null;
  }).filter(Boolean)
});
```

### 2. Frontend Changes (`Frontend/src/components/dashboard/LeadIntelligence.tsx`)

#### Updated LeadGroup Interface
```typescript
interface LeadGroup {
  // ... existing fields ...
  customFields?: Record<string, any>; // Custom business-specific fields from extraction
}
```

#### Added State for Enabled Custom Fields
```typescript
const [enabledCustomFields, setEnabledCustomFields] = useState<{ key: string; label: string; type: string }[]>([]);
```

#### Updated Data Fetch Logic
```typescript
const response = await apiService.getLeadIntelligence(filters);
const responseData = response.data || response as any;

// Handle both old format (array) and new format (object with leadGroups and enabledFields)
if (Array.isArray(responseData)) {
  setContacts(responseData);
  setEnabledCustomFields([]);
} else {
  setContacts(responseData.leadGroups || []);
  setEnabledCustomFields(responseData.enabledFields || []);
}
```

#### Added Dynamic Column Headers
```typescript
<th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground bg-background">Notes</th>
{/* Custom Fields - render columns for enabled fields only */}
{enabledCustomFields.map((field) => (
  <th key={field.key} className="h-12 px-4 text-left align-middle font-medium text-muted-foreground bg-background">
    {field.label}
  </th>
))}
<th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground bg-background">Escalated</th>
```

#### Added Dynamic Table Cells
```typescript
{/* Custom Fields - render cells for enabled fields */}
{enabledCustomFields.map((field) => {
  const value = contact.customFields?.[field.key];
  return (
    <td key={field.key} className="p-4 align-middle text-xs text-foreground max-w-[200px]">
      {value ? (
        typeof value === 'boolean' ? (
          <Badge variant={value ? "default" : "outline"}>
            {value ? 'Yes' : 'No'}
          </Badge>
        ) : typeof value === 'object' ? (
          JSON.stringify(value)
        ) : (
          <span className="truncate" title={String(value)}>
            {String(value).length > 40 
              ? String(value).substring(0, 40) + '...'
              : String(value)}
          </span>
        )
      ) : (
        <span className="text-muted-foreground">-</span>
      )}
    </td>
  );
})}
```

## How It Works

### Data Flow
1. **User Configuration**: Admin enables custom fields for a user in Custom Fields Configuration
2. **Extraction**: When calls/chats are processed, custom fields are extracted by OpenAI/Bolna.ai
3. **Storage**: Custom fields saved in `lead_analytics.custom_fields` JSONB column
4. **Query**: Backend fetches custom_fields from latest analysis for each lead
5. **Response**: Backend returns leadGroups + enabledFields array
6. **Rendering**: Frontend dynamically creates columns for enabled fields only
7. **Display**: Each row shows the custom field values for that lead

### Supported Field Types
- **Text/Dropdown**: Displayed as truncated text with tooltip
- **Number**: Displayed as text
- **Boolean**: Displayed as Yes/No badge
- **Date**: Displayed as formatted date string
- **Object**: JSON stringified

### Backward Compatibility
The implementation supports both response formats:
- **Old format**: `response.data` is an array of leads → no custom fields shown
- **New format**: `response.data` contains `{ leadGroups: [], enabledFields: [] }` → custom fields shown

## Testing Checklist

### Prerequisites
- [x] Migration `1026_add_custom_fields_support.sql` exists
- [x] `lead_analytics.custom_fields` JSONB column exists
- [x] `users.field_configuration` JSONB column exists
- [x] Custom fields being extracted and saved by webhookDataProcessor

### Test Steps
1. **Configure Custom Fields**
   - Navigate to Admin Panel > User Management > select user
   - Go to Custom Fields Configuration tab
   - Enable 5-10 fields (e.g., student_name, course_program, budget_range, industry, delivery_date)
   - Click "Save Configuration"

2. **Generate Extraction JSON**
   - Click "Generate Extraction JSON" button
   - Verify JSON includes enabled fields in `extraction.custom_fields` object
   - Copy JSON and update Bolna.ai/OpenAI system prompt

3. **Make Test Calls/Chats**
   - Create a campaign or make manual calls
   - Ensure conversations include information related to enabled fields
   - Wait for extraction completion

4. **Verify in Lead Intelligence**
   - Navigate to Lead Intelligence page
   - Verify new columns appear after "Notes" column
   - Column headers should match field labels
   - Check that extracted values appear in cells
   - Verify formatting (dates, booleans, numbers, text)

5. **Test with Different Users**
   - Login as different users with different field configurations
   - Verify only their enabled fields appear as columns
   - Verify leads show correct custom field data

## Next Steps (Not Yet Implemented)

### 1. Custom Field Filters
- [ ] Add filter dropdowns for dropdown-type fields (industry, budget_range, product_category)
- [ ] Add number range inputs for number fields (quantity, student_age, number_of_people)
- [ ] Add date pickers for date fields (delivery_date, delivery_time)
- [ ] Add checkboxes for boolean fields (on_site_visit, repeat_customer)

### 2. Backend Filter Implementation
- [ ] Parse custom field filters from query params
- [ ] Build JSONB filter conditions: `WHERE custom_fields @> '{"field_key": "value"}'`
- [ ] Add numeric range filters: `WHERE (custom_fields->>'quantity')::numeric BETWEEN ? AND ?`
- [ ] Add date range filters: `WHERE (custom_fields->>'delivery_date')::date BETWEEN ? AND ?`

### 3. Export with Custom Fields
- [ ] Include custom fields in CSV/Excel exports
- [ ] Add custom field columns to downloaded reports

### 4. Analytics Dashboard
- [ ] Show custom field distributions (charts for dropdowns)
- [ ] Show custom field trends over time
- [ ] Custom field-based segmentation

## Database Schema

### lead_analytics Table
```sql
custom_fields JSONB -- Stores extracted business-specific fields
```

### users Table
```sql
field_configuration JSONB -- Stores enabled fields per user
-- Example: { "enabledFields": ["student_name", "course_program", "budget_range"] }
```

## API Response Format

### Old Format (Deprecated)
```json
[
  {
    "id": "phone_+91 1234567890",
    "name": "John Doe",
    "phone": "+91 1234567890",
    ...
  }
]
```

### New Format (Current)
```json
{
  "leadGroups": [
    {
      "id": "phone_+91 1234567890",
      "name": "John Doe",
      "phone": "+91 1234567890",
      "customFields": {
        "student_name": "Jane Smith",
        "course_program": "MBA",
        "budget_range": "$10,000 - $20,000",
        "industry": "Education",
        "delivery_date": "2024-03-15"
      },
      ...
    }
  ],
  "enabledFields": [
    { "key": "student_name", "label": "Student Name", "type": "text" },
    { "key": "course_program", "label": "Course/Program", "type": "dropdown" },
    { "key": "budget_range", "label": "Budget Range", "type": "dropdown" },
    { "key": "industry", "label": "Industry/Sector", "type": "dropdown" },
    { "key": "delivery_date", "label": "Delivery Date", "type": "date" }
  ]
}
```

## Files Modified

### Backend
- `backend/src/controllers/leadIntelligenceController.ts` - Added custom_fields to queries and response

### Frontend
- `Frontend/src/components/dashboard/LeadIntelligence.tsx` - Added dynamic columns and cells

### Supporting Files (Already Implemented)
- `backend/src/config/fieldLibrary.ts` - Field definitions
- `backend/src/services/leadAnalyticsService.ts` - Saves custom_fields
- `backend/src/migrations/1026_add_custom_fields_support.sql` - Database migration

## Key Technical Decisions

1. **JSONB Storage**: Used PostgreSQL JSONB for flexible schema without adding 19+ columns
2. **CTE Subqueries**: Extracted latest custom_fields per lead type using subqueries
3. **Dynamic Rendering**: Frontend renders columns based on user configuration, not hardcoded
4. **Backward Compatibility**: Supports both array and object response formats
5. **Type Safety**: Handles boolean, string, number, date, and object field types
6. **Performance**: Indexed JSONB column for fast queries (if index exists)

## Performance Considerations

### Query Optimization
- Custom fields retrieved via subqueries per lead (could be optimized with JOINs if needed)
- JSONB operations are indexed (recommend adding GIN index: `CREATE INDEX idx_lead_analytics_custom_fields ON lead_analytics USING GIN (custom_fields);`)

### Frontend Rendering
- Dynamic column rendering has minimal performance impact
- Truncation prevents long text from breaking layout
- React key prop ensures efficient re-rendering

## Troubleshooting

### Custom Fields Not Appearing
1. **Check field configuration**: Verify user has enabled fields in Custom Fields Configuration
2. **Check extraction JSON**: Ensure Bolna.ai/OpenAI prompt includes custom_fields extraction
3. **Check database**: Query `lead_analytics` to verify custom_fields being saved
4. **Check response**: Inspect network tab to verify enabledFields returned
5. **Check console**: Look for JavaScript errors in browser console

### Wrong Data Displayed
1. **Verify field keys**: Ensure field keys in database match field_configuration keys
2. **Check data types**: Verify extraction returns correct types (string for dates, boolean for yes/no)
3. **Clear cache**: Hard refresh browser (Ctrl+Shift+R)

### Performance Issues
1. **Add GIN index**: `CREATE INDEX idx_lead_analytics_custom_fields ON lead_analytics USING GIN (custom_fields);`
2. **Limit enabled fields**: Enable only necessary fields per user
3. **Add pagination**: Limit number of rows displayed

## References
- [Field Library Documentation](backend/src/config/fieldLibrary.ts)
- [Database Schema](database.md)
- [Custom Fields Configuration UI](Frontend/src/components/admin/UserManagement/CustomFieldsConfiguration.tsx)
- [Migration File](backend/src/migrations/1026_add_custom_fields_support.sql)
