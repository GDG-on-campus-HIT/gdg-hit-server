## API Documentation: `GET /api/v1/getAllUsers`

### Overview
This endpoint retrieves all user data from the database, supporting pagination and optional filtering by role, department, verification status, and name. It returns a list of user records along with pagination metadata. The data is sorted by creation date in descending order (newest first). The password field is excluded from the response for security.

---

### Endpoint Details
- **Method**: `GET`
- **URL**: `/api/v1/getAllUsers`
- **Authentication**: Optional (currently commented out; requires `isAuthenticate` middleware if enabled)
- **Authorization**: Optional (currently commented out; requires `authorizeRoles("admin")` if enabled)
- **Content-Type**: `application/json`

---

### Query Parameters
All query parameters are optional.

| Parameter    | Type    | Description                                                                 | Default | Example            |
|--------------|---------|-----------------------------------------------------------------------------|---------|--------------------|
| `page`       | Integer | The page number for pagination                                      | `1`     | `page=2`          |
| `limit`      | Integer | The number of records per page                                      | `10`    | `limit=5`         |
| `role`       | String  | Filter by user role (e.g., "user", "admin")                         | None    | `role=admin`      |
| `department` | String  | Filter by department (e.g., "Engineering")                          | None    | `department=Engineering` |
| `isVerified` | Boolean | Filter by verification status (`true` or `false`)                 | None    | `isVerified=true` |
| `name`       | String  | Filter by name (case-insensitive partial match)                     | None    | `name=john`       |

---

### Response
#### Success Response
- **Status Code**: `200 OK`
- **Body**: JSON object containing user data and pagination metadata.

**Structure**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": String,
        "name": String,
        "email": String,
        "role": String,
        "classRollNo": String,
        "department": String,
        "whatsappNo": Number,
        "isVerified": Boolean,
        "linkedinProfile": String,
        "githubProfile": String,
        "createdAt": ISODate,
        "updatedAt": ISODate
        // Password field is excluded
      }
      // ... more records
    ],
    "pagination": {
      "totalDocuments": Integer,
      "totalPages": Integer,
      "currentPage": Integer,
      "pageSize": Integer,
      "hasNextPage": Boolean,
      "hasPrevPage": Boolean
    }
  }
}
```

**Field Descriptions**:
- **`success`**: Boolean indicating the request was successful.
- **`data.users`**: Array of user records.
  - `_id`: Unique identifier of the user.
  - `name`: Full name of the user.
  - `email`: User’s email address.
  - `role`: User’s role (e.g., "user", "admin").
  - `classRollNo`: User’s class roll number.
  - `department`: User’s department.
  - `whatsappNo`: User’s WhatsApp number.
  - `isVerified`: Whether the user’s email is verified.
  - `linkedinProfile`: URL to the user’s LinkedIn profile (optional).
  - `githubProfile`: URL to the user’s GitHub profile (optional).
  - `createdAt`: Timestamp of record creation.
  - `updatedAt`: Timestamp of last update.
- **`data.pagination`**: Pagination metadata.
  - `totalDocuments`: Total number of records matching the query.
  - `totalPages`: Total number of pages based on `limit`.
  - `currentPage`: Current page number.
  - `pageSize`: Number of records per page.
  - `hasNextPage`: Boolean indicating if there’s a next page.
  - `hasPrevPage`: Boolean indicating if there’s a previous page.

#### Error Response
- **Status Code**: `500 Internal Server Error` (or other codes based on error handling middleware)
- **Body**: JSON object with error details.

**Structure**:
```json
{
  "success": false,
  "message": String,
  "statusCode": Integer
}
```

**Example**:
```json
{
  "success": false,
  "message": "Database connection failed",
  "statusCode": 500
}
```

---

### Examples

#### Example 1: Basic Request
**Request**: 
```
GET /api/v1/getAllUsers?page=1&limit=2
```

**Response**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "65d8f123abc123456789abcd",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "admin",
        "classRollNo": "ENG123",
        "department": "Engineering",
        "whatsappNo": 1234567890,
        "isVerified": true,
        "linkedinProfile": "https://linkedin.com/in/johndoe",
        "githubProfile": "https://github.com/johndoe",
        "createdAt": "2025-01-15T10:00:00.000Z",
        "updatedAt": "2025-01-20T12:00:00.000Z"
      },
      {
        "_id": "65d8f124def456789123abcd",
        "name": "Jane Smith",
        "email": "jane.smith@example.com",
        "role": "user",
        "classRollNo": "MKT456",
        "department": "Marketing",
        "whatsappNo": 9876543210,
        "isVerified": false,
        "linkedinProfile": null,
        "githubProfile": null,
        "createdAt": "2025-01-14T09:30:00.000Z",
        "updatedAt": "2025-01-18T15:00:00.000Z"
      }
    ],
    "pagination": {
      "totalDocuments": 25,
      "totalPages": 13,
      "currentPage": 1,
      "pageSize": 2,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### Example 2: Filtered Request
**Request**: 
```
GET /api/v1/getAllUsers?role=admin&isVerified=true&page=1&limit=1
```

**Response**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "65d8f123abc123456789abcd",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "admin",
        "classRollNo": "ENG123",
        "department": "Engineering",
        "whatsappNo": 1234567890,
        "isVerified": true,
        "linkedinProfile": "https://linkedin.com/in/johndoe",
        "githubProfile": "https://github.com/johndoe",
        "createdAt": "2025-01-15T10:00:00.000Z",
        "updatedAt": "2025-01-20T12:00:00.000Z"
      }
    ],
    "pagination": {
      "totalDocuments": 5,
      "totalPages": 5,
      "currentPage": 1,
      "pageSize": 1,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### Example 3: Name Search
**Request**: 
```
GET /api/v1/getAllUsers?name=john
```

**Response**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "_id": "65d8f123abc123456789abcd",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "role": "admin",
        "classRollNo": "ENG123",
        "department": "Engineering",
        "whatsappNo": 1234567890,
        "isVerified": true,
        "linkedinProfile": "https://linkedin.com/in/johndoe",
        "githubProfile": "https://github.com/johndoe",
        "createdAt": "2025-01-15T10:00:00.000Z",
        "updatedAt": "2025-01-20T12:00:00.000Z"
      }
    ],
    "pagination": {
      "totalDocuments": 1,
      "totalPages": 1,
      "currentPage": 1,
      "pageSize": 10,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

#### Example 4: Error Case
**Request**: 
```
GET /api/v1/getAllUsers?page=invalid
```

**Response** (assuming invalid pagination input isn’t explicitly handled):
```json
{
  "success": false,
  "message": "An unexpected error occurred",
  "statusCode": 500
}
```

---

### Implementation Details
#### Code
```javascript
import { Request, Response, NextFunction } from 'express';
import userModel from '../models/userModel';
import { CatchAsyncError } from '../middleware/catchAsyncError';
import ErrorHandler from '../utils/errorHandler';

export const getAllUsers = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 10, role, department, isVerified, name } = req.query;
      const query: any = {};
      if (role) query.role = role;
      if (department) query.department = department;
      if (isVerified !== undefined) query.isVerified = isVerified === 'true';
      if (name) query.name = { $regex: new RegExp(name as string, 'i') };

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const totalDocuments = await userModel.countDocuments(query);
      const users = await userModel
        .find(query)
        .select('-password')
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 });

      const totalPages = Math.ceil(totalDocuments / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;

      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: { totalDocuments, totalPages, currentPage: pageNum, pageSize: limitNum, hasNextPage, hasPrevPage },
        },
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
```

#### Route Definition
```javascript
userRoute.get(
  "/getAllUsers",
  // isAuthenticate,
  // authorizeRoles("admin"),
  getAllUsers
);
```

#### Dependencies
- **Express**: For handling HTTP requests.
- **Mongoose**: For querying the `userModel`.
- **Middleware**: `CatchAsyncError` for error handling, `isAuthenticate` and `authorizeRoles` for auth (optional).

---

### Additional Notes
#### Security
- **Authentication**: Uncomment `isAuthenticate` in the route to restrict access to logged-in users.
- **Authorization**: Uncomment `authorizeRoles("admin")` to limit access to admin users only.
- **Password Exclusion**: The `password` field is excluded from the response using `.select('-password')`.
- **Input Validation**: Consider adding validation for query parameters (e.g., ensuring `page` and `limit` are positive integers).

#### Performance
- **Indexing**: Ensure MongoDB indexes exist on `role`, `department`, `isVerified`, `name`, and `createdAt` for optimal query performance.
- **Caching**: For frequently accessed data, consider adding a caching layer (e.g., Redis).

#### Extensibility
- **Additional Filters**: Extend the `query` object to support more fields (e.g., `email`, `whatsappNo`, or date ranges with `createdAt`).
- **Sorting**: Add a `sort` query parameter to allow custom sorting (e.g., `?sort=updatedAt`).

#### Error Handling
- Errors are passed to the `ErrorHandler` middleware, which should define the error response format. Customize this as needed for your app.

---

### Testing
- **Tools**: Use Postman, cURL, or a similar tool to test the endpoint.
- **Test Cases**:
  1. Basic pagination (`?page=1&limit=10`).
  2. Filtering by role (`?role=admin`).
  3. Filtering by verification (`?isVerified=true`).
  4. Name search (`?name=john`).
  5. Combining filters (`?department=Engineering&isVerified=false`).
  6. Invalid input (`?page=abc`—should return a 500 error unless validation is added).
  7. Empty result set (`?role=nonexistent`).