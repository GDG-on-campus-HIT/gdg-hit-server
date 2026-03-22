# WhatsApp Group Links Feature - Implementation Documentation

## Overview
This feature allows the recruitment system to automatically deliver WhatsApp group links to applicants based on the domains/positions they selected during the recruitment process.

## Changes Made

### 1. **RecruitmentForm Model** (`models/recruitmentForm.model.ts`)
- Added `whatsappLink?: string` field to `IRoleDefinition` interface
- Updated the schema to include `whatsappLink` field for each role
- Stores WhatsApp group link for each domain/position/role

**Structure:**
```typescript
interface IRoleDefinition {
    roleName: string;       // e.g., "Web Developer"
    description?: string;
    fields: IFormField[];   // Fields specific to this role
    whatsappLink?: string;  // NEW: WhatsApp group link for this role
}
```

### 2. **Recruitment Model** (`models/recruitment.model.ts`)
- Added `whatsappGroupLinks?: Record<string, string>` field to `IRecruitment` interface
- Updated the schema to store selected WhatsApp links
- Maps domain/position names to their respective WhatsApp group links

**Structure:**
```typescript
interface IRecruitment extends Document {
    // ... existing fields ...
    whatsappGroupLinks?: Record<string, string>; // Maps position name to WhatsApp link
    // ... other fields ...
}
```

**Example stored data:**
```json
{
    "whatsappGroupLinks": {
        "Web Developer": "https://chat.whatsapp.com/xxx",
        "Android Developer": "https://chat.whatsapp.com/yyy",
        "ML Engineer": "https://chat.whatsapp.com/zzz"
    }
}
```

### 3. **Recruitment Controller** (`controllers/recruitment.controller.ts`)

#### a. **Added Import**
```typescript
import { RecruitmentFormModel } from "../models/recruitmentForm.model";
```

#### b. **Modified `submitApplication` Function**
- Now fetches the recruitment form when an application is submitted
- Extracts WhatsApp links for all selected positions
- Stores the links in the `whatsappGroupLinks` field of the application

**Key Logic:**
```typescript
// Fetch WhatsApp group links for selected positions/domains
let whatsappGroupLinks: Record<string, string> = {};
if (formId) {
    const recruitmentForm = await RecruitmentFormModel.findById(formId);
    if (recruitmentForm && recruitmentForm.roles) {
        // Map selected positions to their WhatsApp links
        generalInfo.positions.forEach((selectedPosition: string) => {
            const roleData = recruitmentForm.roles.find(
                (role) => role.roleName === selectedPosition
            );
            if (roleData && roleData.whatsappLink) {
                whatsappGroupLinks[selectedPosition] = roleData.whatsappLink;
            }
        });
    }
}
```

#### c. **New Admin Functions**

**1. `getRecruitmentForm(formId)`**
- Get a specific recruitment form with all roles and their WhatsApp links
- Admin-only endpoint
- **Route:** `GET /recruitment/forms/:formId`

**2. `getAllRecruitmentForms()`**
- Get all active and inactive recruitment forms
- Useful for admin panel to see all forms
- **Route:** `GET /recruitment/forms`

**3. `updateRoleWhatsappLink(formId, roleId, whatsappLink)`**
- Update WhatsApp link for a specific role using role ID
- Validates the WhatsApp link format
- **Route:** `PATCH /recruitment/forms/:formId/roles/:roleId/whatsapp`
- **Request Body:**
```json
{
    "whatsappLink": "https://chat.whatsapp.com/xxxxx"
}
```

**4. `updateRoleWhatsappLinkByName(formId, roleName, whatsappLink)`**
- Update WhatsApp link for a specific role using role name (more convenient)
- Validates the WhatsApp link format
- **Route:** `PATCH /recruitment/forms/:formId/role-whatsapp`
- **Request Body:**
```json
{
    "roleName": "Web Developer",
    "whatsappLink": "https://chat.whatsapp.com/xxxxx"
}
```

### 4. **Recruitment Routes** (`routes/recruitment.route.ts`)

New routes added for WhatsApp link management:

```typescript
// Get all recruitment forms
GET /recruitment/forms
// Authorization: Admin only

// Get specific recruitment form
GET /recruitment/forms/:formId
// Authorization: Admin only

// Update WhatsApp link by role ID
PATCH /recruitment/forms/:formId/roles/:roleId/whatsapp
// Authorization: Admin only

// Update WhatsApp link by role name (Recommended)
PATCH /recruitment/forms/:formId/role-whatsapp
// Authorization: Admin only
```

## How It Works

### User Flow
1. User selects one or more domains/positions during recruitment signup
2. When they submit the application, the system:
   - Fetches the recruitment form definition
   - Finds WhatsApp links for each selected position
   - Stores these links in the application document under `whatsappGroupLinks`

### Example
If a user selects:
- Web Developer
- Mobile App Developer

The system will:
1. Look up the WhatsApp link for "Web Developer" from the form
2. Look up the WhatsApp link for "Mobile App Developer" from the form
3. Store both links in the application:
```json
{
    "whatsappGroupLinks": {
        "Web Developer": "https://chat.whatsapp.com/abc123",
        "Mobile App Developer": "https://chat.whatsapp.com/def456"
    }
}
```

### Admin Panel Flow
1. Admin accesses the recruitment form management panel
2. Selects a recruitment form
3. For each domain/role, adds/updates the WhatsApp group link
4. Saves the changes
5. Future applicants automatically receive the updated links

## Validation

The system includes validation for WhatsApp links:
- Link must be a non-empty string
- Link must contain "whatsapp" or "chat.whatsapp" in the URL
- If validation fails, returns a 400 error with descriptive message

## API Examples

### Getting a Recruitment Form with WhatsApp Links
```bash
GET /api/recruitment/forms/64f8c1d2b9e4a5c3d8e2f1a9
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
    "success": true,
    "form": {
        "_id": "64f8c1d2b9e4a5c3d8e2f1a9",
        "title": "Winter Recruitment 2025",
        "isActive": true,
        "roles": [
            {
                "_id": "64f8c1d2b9e4a5c3d8e2f1a0",
                "roleName": "Web Developer",
                "description": "Full-stack web development",
                "whatsappLink": "https://chat.whatsapp.com/abc123",
                "fields": [...]
            },
            {
                "_id": "64f8c1d2b9e4a5c3d8e2f1a1",
                "roleName": "Android Developer",
                "description": "Mobile app development",
                "whatsappLink": "https://chat.whatsapp.com/def456",
                "fields": [...]
            }
        ]
    }
}
```

### Updating WhatsApp Link by Role Name
```bash
PATCH /api/recruitment/forms/64f8c1d2b9e4a5c3d8e2f1a9/role-whatsapp
Authorization: Bearer <admin_token>
Content-Type: application/json

{
    "roleName": "Web Developer",
    "whatsappLink": "https://chat.whatsapp.com/xyz789"
}
```

**Response:**
```json
{
    "success": true,
    "message": "WhatsApp link updated successfully",
    "form": { ... }
}
```

### User Submitting Application with Selected Domains
```bash
POST /api/recruitment/recruitmentFormSubmission
Authorization: Bearer <user_token>
Content-Type: application/json

{
    "formId": "64f8c1d2b9e4a5c3d8e2f1a9",
    "generalInfo": {
        "fullName": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "9876543210",
        "rollNumber": "12345",
        "branch": "CSE",
        "branchYear": "2024",
        "positions": ["Web Developer", "Android Developer"]
    },
    "roleSpecific": { ... },
    "finalInfo": { ... }
}
```

**Response:**
```json
{
    "success": true,
    "application": {
        "_id": "64f8c1d2b9e4a5c3d8e2f1aa",
        "user": "64f8c1d2b9e4a5c3d8e2f1ab",
        "formId": "64f8c1d2b9e4a5c3d8e2f1a9",
        "generalInfo": { ... },
        "roleSpecific": { ... },
        "finalInfo": { ... },
        "whatsappGroupLinks": {
            "Web Developer": "https://chat.whatsapp.com/abc123",
            "Android Developer": "https://chat.whatsapp.com/def456"
        },
        "status": "pending",
        "createdAt": "2025-01-15T10:30:00Z"
    }
}
```

## Database Sample

Here's how the data looks in MongoDB:

**RecruitmentForm Document:**
```json
{
    "_id": ObjectId("64f8c1d2b9e4a5c3d8e2f1a9"),
    "title": "Winter Recruitment 2025",
    "isActive": true,
    "roles": [
        {
            "_id": ObjectId("64f8c1d2b9e4a5c3d8e2f1a0"),
            "roleName": "Web Developer",
            "description": "Full-stack web development",
            "whatsappLink": "https://chat.whatsapp.com/abc123",
            "fields": [...]
        },
        {
            "_id": ObjectId("64f8c1d2b9e4a5c3d8e2f1a1"),
            "roleName": "Android Developer",
            "description": "Mobile development",
            "whatsappLink": "https://chat.whatsapp.com/def456",
            "fields": [...]
        }
    ]
}
```

**Recruitment Document (Application):**
```json
{
    "_id": ObjectId("64f8c1d2b9e4a5c3d8e2f1aa"),
    "user": ObjectId("64f8c1d2b9e4a5c3d8e2f1ab"),
    "formId": ObjectId("64f8c1d2b9e4a5c3d8e2f1a9"),
    "generalInfo": {
        "fullName": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "9876543210",
        "rollNumber": "12345",
        "branch": "CSE",
        "branchYear": "2024",
        "positions": ["Web Developer", "Android Developer"]
    },
    "roleSpecific": { ... },
    "finalInfo": { ... },
    "whatsappGroupLinks": {
        "Web Developer": "https://chat.whatsapp.com/abc123",
        "Android Developer": "https://chat.whatsapp.com/def456"
    },
    "status": "pending",
    "createdAt": ISODate("2025-01-15T10:30:00Z"),
    "updatedAt": ISODate("2025-01-15T10:30:00Z")
}
```

## Benefits

1. **Automated Distribution**: No manual effort to send WhatsApp links to applicants
2. **Domain-Specific Links**: Each domain/position has its own active group
3. **Multi-Domain Support**: Users applying for multiple domains get all relevant links
4. **Admin Control**: Easy management of WhatsApp links from admin panel
5. **Scalable**: Works for any number of domains and applicants
6. **Data Tracking**: Links are stored with each application for reference

## Future Enhancements

1. Add WhatsApp group link templates
2. Automatic WhatsApp message sending to users
3. Group URL expiration management
4. Activity tracking (when users joined groups)
5. Email notifications with WhatsApp links
6. QR code generation for WhatsApp groups
