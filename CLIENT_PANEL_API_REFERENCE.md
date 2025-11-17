# Client Panel API Endpoints Reference

## Base URL
All endpoints are prefixed with `/api/admin/client-panel`

## Authentication
All endpoints require:
- Valid JWT token in Authorization header
- User role: `admin` or `super_admin`

---

## Endpoints

### 1. Get Users List
```http
GET /api/admin/client-panel/users
```

**Query Parameters:**
- `search` (optional): Search by name, email, or company

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "company": "Acme Inc",
      "role": "user",
      "is_active": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "timestamp": "2025-11-18T..."
}
```

---

### 2. Get Aggregate Metrics
```http
GET /api/admin/client-panel/metrics
```

**Query Parameters:**
- `userId` (optional): Filter by specific user ID

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 10,
    "totalAgents": 45,
    "totalCalls": 1234,
    "totalContacts": 5678,
    "totalCampaigns": 12,
    "totalCustomers": 890,
    "totalCallMinutes": 15000,
    "totalCreditsUsed": 450,
    "completedCalls": 1100,
    "failedCalls": 134,
    "successRate": 89
  },
  "timestamp": "2025-11-18T..."
}
```

---

### 3. Get Overview Data
```http
GET /api/admin/client-panel/overview
```

**Query Parameters:**
- `userId` (optional): Filter by specific user ID
- `startDate` (optional): Start date for filtering (ISO 8601)
- `endDate` (optional): End date for filtering (ISO 8601)

**Response:**
```json
{
  "success": true,
  "data": {
    "callTrends": [
      {
        "date": "2025-11-01",
        "total_calls": 45,
        "completed_calls": 40,
        "failed_calls": 5,
        "total_duration": 120,
        "credits_used": 15
      }
    ]
  },
  "timestamp": "2025-11-18T..."
}
```

---

### 4. Get Agents
```http
GET /api/admin/client-panel/agents
```

**Query Parameters:**
- `userId` (optional): Filter by specific user ID
- `page` (default: 1): Page number
- `limit` (default: 50): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "agents": [
      {
        "id": "uuid",
        "name": "Sales Agent",
        "agent_type": "call",
        "is_active": true,
        "user_name": "John Doe",
        "user_email": "john@example.com",
        "total_calls": 123,
        "created_at": "2025-01-01T..."
      }
    ],
    "total": 45,
    "page": 1,
    "limit": 50
  },
  "timestamp": "2025-11-18T..."
}
```

---

### 5. Get Calls (Unified Call Logs)
```http
GET /api/admin/client-panel/calls
```

**Query Parameters:**
- `userId` (optional): Filter by specific user ID
- `status` (optional): Filter by status (completed, failed, in_progress, cancelled)
- `startDate` (optional): Start date filter
- `endDate` (optional): End date filter
- `page` (default: 1): Page number
- `limit` (default: 50): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "calls": [
      {
        "id": "uuid",
        "phone_number": "+1234567890",
        "status": "completed",
        "duration_minutes": 5,
        "credits_used": 2,
        "agent_name": "Sales Agent",
        "user_name": "John Doe",
        "user_email": "john@example.com",
        "contact_name": "Jane Smith",
        "created_at": "2025-11-18T..."
      }
    ],
    "total": 1234,
    "page": 1,
    "limit": 50
  },
  "timestamp": "2025-11-18T..."
}
```

---

### 6. Get Contacts
```http
GET /api/admin/client-panel/contacts
```

**Query Parameters:**
- `userId` (optional): Filter by specific user ID
- `search` (optional): Search by name, phone, or email
- `page` (default: 1): Page number
- `limit` (default: 50): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "id": "uuid",
        "name": "Jane Smith",
        "phone_number": "+1234567890",
        "email": "jane@example.com",
        "company": "Tech Corp",
        "user_name": "John Doe",
        "user_email": "john@example.com",
        "total_calls": 5,
        "created_at": "2025-11-18T..."
      }
    ],
    "total": 5678,
    "page": 1,
    "limit": 50
  },
  "timestamp": "2025-11-18T..."
}
```

---

### 7. Get Campaigns
```http
GET /api/admin/client-panel/campaigns
```

**Query Parameters:**
- `userId` (optional): Filter by specific user ID
- `status` (optional): Filter by status (pending, active, paused, completed, cancelled)
- `page` (default: 1): Page number
- `limit` (default: 50): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": "uuid",
        "name": "Q4 Outreach",
        "status": "active",
        "user_name": "John Doe",
        "user_email": "john@example.com",
        "agent_name": "Sales Agent",
        "total_calls": 45,
        "created_at": "2025-11-18T..."
      }
    ],
    "total": 12,
    "page": 1,
    "limit": 50
  },
  "timestamp": "2025-11-18T..."
}
```

---

### 8. Get Customers
```http
GET /api/admin/client-panel/customers
```

**Query Parameters:**
- `userId` (optional): Filter by specific user ID
- `search` (optional): Search by name or company
- `page` (default: 1): Page number
- `limit` (default: 50): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": "uuid",
        "name": "Jane Smith",
        "phone_number": "+1234567890",
        "email": "jane@example.com",
        "company": "Tech Corp",
        "user_name": "John Doe",
        "user_email": "john@example.com",
        "total_calls": 8,
        "last_contact_date": "2025-11-15T...",
        "created_at": "2025-11-01T..."
      }
    ],
    "total": 890,
    "page": 1,
    "limit": 50
  },
  "timestamp": "2025-11-18T..."
}
```

---

### 9. Get Lead Intelligence
```http
GET /api/admin/client-panel/lead-intelligence
```

**Query Parameters:**
- `userId` (optional): Filter by specific user ID
- `page` (default: 1): Page number
- `limit` (default: 50): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "intelligence": [
      {
        "id": "uuid",
        "phone_number": "+1234567890",
        "caller_name": "Jane Smith",
        "agent_name": "Sales Agent",
        "user_name": "John Doe",
        "user_email": "john@example.com",
        "intent_score": 85,
        "sentiment": "positive",
        "created_at": "2025-11-18T..."
      }
    ],
    "total": 450,
    "page": 1,
    "limit": 50
  },
  "timestamp": "2025-11-18T..."
}
```

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "timestamp": "2025-11-18T..."
  }
}
```

**Common Error Codes:**
- `CLIENT_PANEL_USERS_ERROR` - Failed to fetch users
- `CLIENT_PANEL_METRICS_ERROR` - Failed to fetch metrics
- `CLIENT_PANEL_OVERVIEW_ERROR` - Failed to fetch overview
- `CLIENT_PANEL_AGENTS_ERROR` - Failed to fetch agents
- `CLIENT_PANEL_CALLS_ERROR` - Failed to fetch calls
- `CLIENT_PANEL_CONTACTS_ERROR` - Failed to fetch contacts
- `CLIENT_PANEL_CAMPAIGNS_ERROR` - Failed to fetch campaigns
- `CLIENT_PANEL_CUSTOMERS_ERROR` - Failed to fetch customers
- `CLIENT_PANEL_LEAD_INTELLIGENCE_ERROR` - Failed to fetch intelligence data

---

## Testing with cURL

### Example: Get all metrics
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/admin/client-panel/metrics
```

### Example: Get specific user's calls
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/admin/client-panel/calls?userId=USER_UUID&page=1&limit=20"
```

### Example: Search contacts
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/admin/client-panel/contacts?search=john&page=1"
```

---

## Notes

1. All timestamps are in ISO 8601 format (UTC)
2. All UUIDs are version 4
3. Pagination uses 1-based indexing
4. All endpoints log admin actions for audit trail
5. Response times optimized with proper database indexing
