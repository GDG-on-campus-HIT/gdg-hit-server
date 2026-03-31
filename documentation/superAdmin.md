# Super Admin Role - Feature Documentation

## Overview
A new "super_admin" role has been introduced to manage admins and track their recruitment activities. Super Admins can add/remove regular admins and view detailed activity logs of all admin interactions during the recruitment process.

## Super Admin Credentials
- **Email**: ayushmanr601@gmail.com
- **Password**: password1234

> ⚠️ **Important**: Change the super admin password after first login for security.

## How to Setup
To seed the super admin user to your database, run:

```bash
npx ts-node scripts/seedSuperAdmin.ts
```

This will create the super admin user if it doesn't exist, or update the role to `super_admin` if the user already exists.

## Features

### 1. Admin Management
Super Admins can add and remove regular admins from the admin panel.

#### Add New Admin
- **Endpoint**: `POST /api/v1/superadmin/admins/add`
- **Authentication**: Required (Super Admin only)
- **Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```
> **Note**: Password is optional. If not provided, a strong random password will be automatically generated.

- **Optional Password**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "customPassword123"
}
```

- **Response**:
```json
{
  "success": true,
  "message": "Admin added successfully",
  "admin": {
    "_id": "60d5ec49c1b4f...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "password": "Xy9$mK2@pL8#qR5!"
  }
}
```
> **Important**: The auto-generated password is returned in the response. Share this password with the new admin securely. The super admin should communicate this password to the new admin through a secure channel.

#### Remove Admin
- **Endpoint**: `DELETE /api/v1/superadmin/admins/{adminId}`
- **Authentication**: Required (Super Admin only)
- **Response**:
```json
{
  "success": true,
  "message": "Admin removed successfully"
}
```

#### Get All Admins
- **Endpoint**: `GET /api/v1/superadmin/admins`
- **Authentication**: Required (Super Admin only)
- **Response**:
```json
{
  "success": true,
  "admins": [
    {
      "_id": "60d5ec49c1b4f...",
      "name": "Admin User",
      "email": "admin@example.com",
      "role": "admin",
      "department": "Administration",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### 2. Activity Logging
All admin activities during recruitment (shortlisting, rejection, status updates) are automatically logged for audit and fairness purposes.

#### View All Activity Logs
- **Endpoint**: `GET /api/v1/superadmin/activity-logs`
- **Authentication**: Required (Super Admin only)
- **Query Parameters**:
  - `adminId` (optional): Filter logs by specific admin
  - `action` (optional): Filter by action type (shortlist, reject, accept, update_status, add_admin, remove_admin)
  - `startDate` (optional): Filter logs from this date (ISO format)
  - `endDate` (optional): Filter logs until this date (ISO format)
  - `limit` (optional): Number of logs per page (default: 50)
  - `page` (optional): Page number (default: 1)

- **Example Request**:
```
GET /api/v1/superadmin/activity-logs?adminId=60d5ec49c1b4f&startDate=2024-01-01&endDate=2024-01-31&limit=20&page=1
```

- **Response**:
```json
{
  "success": true,
  "logs": [
    {
      "_id": "60d5ec49c1b4f...",
      "admin": {
        "_id": "60d5ec49c1b4f...",
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "action": "shortlist",
      "candidateId": "60d5ec49c1b4f...",
      "candidateName": "Candidate Name",
      "candidateEmail": "candidate@example.com",
      "domain": "Web Developer, UI/UX Designer",
      "oldStatus": "pending",
      "newStatus": "shortlisted",
      "description": "Updated application status from \"pending\" to \"shortlisted\" for Candidate Name",
      "ipAddress": "192.168.1.1",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "pages": 3
  }
}
```

#### View Activity Log Summary
- **Endpoint**: `GET /api/v1/superadmin/activity-logs/summary`
- **Authentication**: Required (Super Admin only)
- **Query Parameters**:
  - `startDate` (optional): Summary from this date
  - `endDate` (optional): Summary until this date

- **Response**:
```json
{
  "success": true,
  "summary": {
    "totalLogs": 500,
    "actionCounts": [
      { "_id": "shortlist", "count": 250 },
      { "_id": "reject", "count": 200 },
      { "_id": "accept", "count": 50 }
    ],
    "adminActivityCounts": [
      {
        "_id": "60d5ec49c1b4f...",
        "count": 150,
        "shortlistCount": 100,
        "rejectCount": 45,
        "acceptCount": 5,
        "adminInfo": [
          {
            "_id": "60d5ec49c1b4f...",
            "name": "Admin User",
            "email": "admin@example.com"
          }
        ]
      }
    ]
  }
}
```

#### View Specific Admin's Activity Logs
- **Endpoint**: `GET /api/v1/superadmin/activity-logs/{adminId}`
- **Authentication**: Required (Super Admin only)
- **Query Parameters**:
  - `limit` (optional): Number of logs per page (default: 50)
  - `page` (optional): Page number (default: 1)

- **Response**:
```json
{
  "success": true,
  "admin": {
    "_id": "60d5ec49c1b4f...",
    "name": "Admin User",
    "email": "admin@example.com"
  },
  "logs": [
    {
      "_id": "60d5ec49c1b4f...",
      "action": "shortlist",
      "candidateName": "Candidate Name",
      "candidateEmail": "candidate@example.com",
      "domain": "Web Developer",
      "oldStatus": "pending",
      "newStatus": "shortlisted",
      "description": "Updated application status from \"pending\" to \"shortlisted\" for Candidate Name",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 75,
    "page": 1,
    "limit": 50,
    "pages": 2
  }
}
```

## Activity Log Fields

| Field | Type | Description |
|-------|------|-------------|
| admin | ObjectId | Reference to the admin who performed the action |
| action | String | Type of action: `shortlist`, `reject`, `accept`, `update_status`, `add_admin`, `remove_admin` |
| candidateId | ObjectId | Reference to the candidate application |
| candidateName | String | Name of the candidate |
| candidateEmail | String | Email of the candidate |
| domain | String | Position/domain being evaluated |
| oldStatus | String | Previous status |
| newStatus | String | New status |
| description | String | Detailed description of the action |
| ipAddress | String | IP address of the admin |
| userAgent | String | Browser/client information |
| timestamp | Date | When the action was performed |

## Automatic Activity Logging

All admin actions related to candidate status updates are automatically logged:

1. **Shortlisting**: When admin marks a candidate as shortlisted
2. **Rejection**: When admin rejects a candidate
3. **Acceptance**: When admin accepts/approves a candidate
4. **Status Updates**: Any other status changes
5. **Admin Management**: When super admin adds or removes admin users

## User Roles

### Super Admin Role
- Can view all admin activity logs
- Can add new admins
- Can remove existing admins
- Full recruitment dashboard access

### Admin Role
- Can shortlist/reject/accept candidates
- Cannot view other admins' activity (only super admins can)
- Cannot add or remove other admins
- Can view recruitment applications

### User Role
- Can submit recruitment applications
- Can view their own application status
- Read-only access to recruitment information

## Security Considerations

1. **Activity Logging**: All admin actions are automatically logged with IP address and user agent
2. **Role-Based Access Control**: Only super admins can manage other admins
3. **Password Security**: Ensure strong passwords when creating new admins
4. **Audit Trail**: Complete audit trail maintained for compliance and fair recruitment
5. **Super Admin Protection**: Super admins cannot remove themselves

## Future Enhancements

As mentioned, the following enhancements are planned:

1. **Domain-Based Shortlisting**: Candidates will be shortlisted/rejected per domain
   - Example: A candidate applying for Web Developer and Photographer can have different statuses for each domain
   - Each domain interview will have separate tracking

2. **Per-Domain Activity Logs**: Logs will specifically track which domain a candidate was evaluated for

## Example Use Cases

### Use Case 1: Auditing Admin Performance
```
GET /api/v1/superadmin/activity-logs?adminId=60d5ec49c1b4f&startDate=2024-01-01&endDate=2024-01-31
```
This returns all activities performed by a specific admin during January, helping verify fair and consistent evaluation.

### Use Case 2: Tracking Rejections
```
GET /api/v1/superadmin/activity-logs?action=reject&startDate=2024-01-15
```
Returns all candidate rejections from January 15 onwards to review rejection patterns.

### Use Case 3: Performance Summary
```
GET /api/v1/superadmin/activity-logs/summary?startDate=2024-01-01&endDate=2024-01-31
```
Provides a high-level overview of recruitment activities for the month.

## API Authentication

All super admin endpoints require:
1. Valid JWT access token
2. User must have `super_admin` role

Include token in Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Please login to access the resource"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied: Your role (admin) is not authorized to access this resource."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Admin not found"
}
```

## Support

For issues or questions regarding the super admin feature, please contact the development team or create an issue in the repository.
