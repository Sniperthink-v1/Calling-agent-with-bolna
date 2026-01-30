# n8n Workflow: Gmail Lead to AI Call

This workflow automatically fetches leads from Gmail (TradeIndia, IndiaMART emails), parses them, and triggers AI calls via the SniperThink Calling Agent API.

## 📋 Workflow Overview

```
┌─────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│  Gmail Trigger  │───►│  Get Email with    │───►│  Extract EML       │
│  (Every Minute) │    │  Attachments       │    │  Attachments       │
└─────────────────┘    └────────────────────┘    └─────────┬──────────┘
                                                           │
                                                           ▼
┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐
│  Filter Valid   │◄───│  Parse Lead      │◄───│  (TradeIndia/      │
│  Leads (phone)  │    │  Data            │    │  IndiaMART parser) │
└────────┬────────┘    └──────────────────┘    └────────────────────┘
         │
         ▼
┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐
│  Prepare API    │───►│  Trigger AI      │───►│  Check Response    │
│  Payload        │    │  Call            │    │  (Success/Fail)    │
└─────────────────┘    └──────────────────┘    └────────────────────┘
```

## 🚀 Quick Setup

### Step 1: Import Workflow

1. Open your n8n instance
2. Go to **Workflows** → **Import from File**
3. Select `gmail-lead-to-call-workflow.json`

### Step 2: Configure Agent ID

**⚠️ CRITICAL: You must set your Agent ID**

1. Open the workflow in n8n
2. Find the node: **"Prepare API Payload"**
3. In the code, replace:
   ```javascript
   const AGENT_ID = "YOUR-AGENT-UUID-FROM-DASHBOARD";
   ```
   With your actual Agent UUID from the SniperThink dashboard.

### Step 3: Connect Gmail

1. Click on **"Gmail Trigger"** node
2. Click **Credential** → **Create New** (or select existing)
3. Authenticate with your Gmail account
4. Repeat for **"Get Email with Attachments"** node

### Step 4: Test the Workflow

1. Click **"Test Workflow"** button
2. Check each node's output to verify data flow
3. Confirm calls are being initiated

## 📦 Nodes Explained

| Node | Purpose |
|------|---------|
| **Gmail Trigger** | Polls inbox every minute for new emails |
| **Get Email with Attachments** | Downloads email with EML attachments |
| **Extract EML Attachments** | Parses EML files from attachments |
| **Parse Lead Data** | Extracts TradeIndia/IndiaMART lead info |
| **Filter Valid Leads** | Removes leads without phone numbers |
| **Prepare API Payload** | Maps data to API format |
| **Trigger AI Call** | Sends POST request to initiate call |
| **Check API Response** | Routes success/failure |
| **Log Success/Failure** | Records results for debugging |

## 🔧 Customization

### Change API Endpoint

If using a different environment, update the URL in **"Trigger AI Call"** node:

| Environment | URL |
|-------------|-----|
| Production | `https://calling-agent-with-bolna-production.up.railway.app/api/webhooks/n8n/lead-call` |
| Local Dev | `http://localhost:3000/api/webhooks/n8n/lead-call` |

### Filter by Label/Folder

To fetch only emails with specific labels:

1. Open **"Gmail - Fetch Leads"** node
2. Add **Label IDs** filter
3. Use label ID like `Label_123456789` or `INBOX`, `UNREAD`

### Add Delay Between Calls

To avoid hitting concurrency limits, add a **Wait** node after **"Trigger AI Call"**:

1. Add **Wait** node between calls
2. Set delay to 5-10 seconds

## 📊 Sample API Payload

The workflow sends this format to the API:

```json
{
  "agent_id": "your-agent-uuid",
  "lead_name": "New Company",
  "recipient_phone_number": "+919446462443",
  "Source": "TradeIndia",
  "Notes": "Product: Plastic flower pots | Subject: New Inquiry for Plastic flower pots | Lead Date: 2025-11-29",
  "company": "New Company",
  "country": "India"
}
```

## ✅ API Response Handling

### Success Response
```json
{
  "success": true,
  "message": "Lead captured and call initiated",
  "data": {
    "contact_id": "uuid",
    "call_id": "uuid",
    "execution_id": "bolna-xxx",
    "contact_created": true,
    "status": "initiated"
  }
}
```

### Common Errors

| Error | Solution |
|-------|----------|
| `Invalid agent_id` | Check your Agent UUID in dashboard |
| `Agent is not active` | Activate the agent in dashboard |
| `Insufficient credits` | Add credits to your account |
| `429 - Concurrency limit` | Add delay between calls, or increase limit |

## 🔄 Production Setup

### 1. Gmail Trigger Settings

The workflow uses **Gmail Trigger** which polls every minute by default. To adjust:

1. Open **"Gmail Trigger"** node
2. Change **Poll Times** → e.g., "Every 5 minutes" or "Every Hour"
3. Add **Label IDs** filter to only process specific labels

### 2. Add Error Handling

Add **Error Trigger** workflow to catch and alert on failures.

### 3. Track Processed Emails

Add a **Google Sheets** or **Database** node to log processed email IDs and avoid duplicate calls.

## 🔍 Troubleshooting

### No Leads Being Parsed
- Check if EML attachments exist in emails
- Verify email format matches TradeIndia/IndiaMART patterns

### Calls Not Initiating
- Check API response in "Trigger AI Call" node output
- Verify agent_id is correct and agent is active
- Confirm user has sufficient credits

### 429 Rate Limit Errors
- Add Wait node with 5-10 second delay
- Check user's concurrent call limit in dashboard

## 📁 File Location

```
n8n-workflows/
└── gmail-lead-to-call-workflow.json  ← Import this file
```

## 🔗 Related Documentation

- [N8N_LEAD_WEBHOOK_GUIDE.md](../N8N_LEAD_WEBHOOK_GUIDE.md) - API webhook documentation
- [API.md](../API.md) - Full API reference
