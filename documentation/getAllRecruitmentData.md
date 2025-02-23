## API Documentation: `GET /api/analytics/getAllRecruitmentData`

### Overview
This endpoint retrieves all recruitment data from the database, supporting pagination and optional filtering by branch, year, status, and position. It returns a list of recruitment records along with pagination metadata. The data is sorted by creation date in descending order (newest first).

---

### Endpoint Details
- **Method**: `GET`
- **URL**: `/api/analytics/getAllRecruitmentData`
- **Authentication**: Optional (currently commented out; requires `isAuthenticate` middleware if enabled)
- **Authorization**: Optional (currently commented out; requires `authorizeRoles("admin")` if enabled)
- **Content-Type**: `application/json`

---

### Query Parameters
All query parameters are optional.

| Parameter   | Type    | Description                                                                 | Default | Example            |
|-------------|---------|-----------------------------------------------------------------------------|---------|--------------------|
| `page`      | Integer | The page number for pagination                                      | `1`     | `page=2`          |
| `limit`     | Integer | The number of records per page                                      | `10`    | `limit=5`         |
| `branch`    | String  | Filter by branch (e.g., "Engineering")                              | None    | `branch=Engineering` |
| `year`      | String  | Filter by branch year (e.g., "2023")                                | None    | `year=2023`       |
| `status`    | String  | Filter by application status (e.g., "accepted", "rejected")         | None    | `status=accepted` |
| `position`  | String  | Filter by position applied for (matches any in the positions array) | None    | `position=Software Engineer` |

---

### Response
#### Success Response
- **Status Code**: `200 OK`
- **Body**: JSON object containing recruitment data and pagination metadata.

**Structure**:
```json
{
  "success": true,
  "data": {
    "recruitmentData": [
      {
        "_id": String,
        "generalInfo": {
          "branch": String,
          "branchYear": String,
          "positions": [String]
        },
        "status": String,
        "createdAt": ISODate,
        "updatedAt": ISODate
        // Additional fields depend on the RecruitmentModel schema
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
- **`data.recruitmentData`**: Array of recruitment records.
  - `_id`: Unique identifier of the recruitment record.
  - `generalInfo.branch`: The branch/department of the applicant.
  - `generalInfo.branchYear`: The year associated with the branch.
  - `generalInfo.positions`: Array of positions applied for.
  - `status`: Current status of the application (e.g., "accepted", "rejected", "shortlisted").
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
GET /api/analytics/getAllRecruitmentData?page=1&limit=2
```

**Response**:
```json
{
  "success": true,
  "data": {
    "recruitmentData": [
      {
        "_id": "65d8f123abc123456789abcd",
        "generalInfo": {
          "branch": "Engineering",
          "branchYear": "2023",
          "positions": ["Software Engineer", "Data Analyst"]
        },
        "status": "accepted",
        "createdAt": "2025-01-15T10:00:00.000Z",
        "updatedAt": "2025-01-20T12:00:00.000Z"
      },
      {
        "_id": "65d8f124def456789123abcd",
        "generalInfo": {
          "branch": "Marketing",
          "branchYear": "2024",
          "positions": ["Marketing Manager"]
        },
        "status": "shortlisted",
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
GET /api/analytics/getAllRecruitmentData?branch=Engineering&status=accepted&page=1&limit=1
```

**Response**:
```json
{
  "success": true,
  "data": {
    "recruitmentData": [
      {
        "_id": "65d8f123abc123456789abcd",
        "generalInfo": {
          "branch": "Engineering",
          "branchYear": "2023",
          "positions": ["Software Engineer", "Data Analyst"]
        },
        "status": "accepted",
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

#### Example 3: Error Case
**Request**: 
```
GET /api/analytics/getAllRecruitmentData?page=invalid
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
export const getAllRecruitmentData = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 10, branch, year, status, position } = req.query;
      const query: any = {};
      if (branch) query['generalInfo.branch'] = branch;
      if (year) query['generalInfo.branchYear'] = year;
      if (status) query.status = status;
      if (position) query['generalInfo.positions'] = { $in: [position] };

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      const totalDocuments = await RecruitmentModel.countDocuments(query);
      const recruitmentData = await RecruitmentModel.find(query)
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 });

      const totalPages = Math.ceil(totalDocuments / limitNum);
      const hasNextPage = pageNum < totalPages;
      const hasPrevPage = pageNum > 1;

      res.status(200).json({
        success: true,
        data: {
          recruitmentData,
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
analyticsRoute.get(
  "/getAllRecruitmentData",
  // isAuthenticate,
  // authorizeRoles("admin"),
  getAllRecruitmentData
);
```

#### Dependencies
- **Express**: For handling HTTP requests.
- **Mongoose**: For querying the `RecruitmentModel`.
- **Middleware**: `CatchAsyncError` for error handling, `isAuthenticate` and `authorizeRoles` for auth (optional).

---

### Additional Notes
#### Security
- **Authentication**: Uncomment `isAuthenticate` in the route to restrict access to logged-in users.
- **Authorization**: Uncomment `authorizeRoles("admin")` to limit access to admin users only.
- **Input Validation**: Consider adding validation for query parameters (e.g., ensuring `page` and `limit` are positive integers) to prevent edge cases.

#### Performance
- **Indexing**: Ensure MongoDB indexes exist on `generalInfo.branch`, `generalInfo.branchYear`, `status`, `generalInfo.positions`, and `createdAt` for optimal query performance.
- **Caching**: For frequently accessed data, consider adding a caching layer (e.g., Redis) as shown in the `getRecruitmentAnalytics` enhancement.

#### Extensibility
- **Additional Filters**: Extend the `query` object to support more fields (e.g., date ranges with `createdAt`).
- **Sorting**: Add a `sort` query parameter to allow custom sorting (e.g., `?sort=updatedAt`).

#### Error Handling
- Errors are passed to the `ErrorHandler` middleware, which should define the error response format. Customize this as needed for your app.

---

### Testing
- **Tools**: Use Postman, cURL, or a similar tool to test the endpoint.
- **Test Cases**:
  1. Basic pagination (`?page=1&limit=10`).
  2. Filtering by one field (`?status=accepted`).
  3. Combining filters (`?branch=Engineering&year=2023`).
  4. Invalid input (`?page=abc`—should return a 500 error unless validation is added).
  5. Empty result set (`?branch=NonExistent`).