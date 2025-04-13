# 📘 Blog API Documentation

## 🚀 Create a New Blog Post

**Endpoint:** `POST /api/v1/createBlog`

**Description:** Allows admins and members to create a new blog post. The slug is auto-generated from the title. Only authenticated users with appropriate roles can use this endpoint.

**Authentication Required:** ✅ Yes  
**Roles Allowed:** `admin`, `member`

---

## 📤 Request

### 📌 Headers
```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

### 📝 Body
```json
{
  "title": "How to Contribute to Open Source",
  "description": "A step-by-step guide on getting started with contributing to open source projects.",
  "content": "Open source contribution is a great way to learn, grow, and give back to the community. In this blog, we'll cover everything from finding the right project to making your first pull request.",
  "imageUrl": "https://res.cloudinary.com/demo/image/upload/v1712934772/blogs/opensource-guide.png",
  "tags": ["Open Source", "GitHub", "Contribution", "Beginner"],
  "isPublished": true,
  "authorId": "6618eabc3d20e5b95f3461a2"
}
```

---

## 📥 Response

### ✅ 201 Created
```json
{
  "success": true,
  "blog": {
    "_id": "67fa621651e325875c8ef473",
    "title": "How to Contribute to Open Source",
    "slug": "how-to-contribute-to-open-source",
    "description": "A step-by-step guide on getting started with contributing to open source projects.",
    "content": "Open source contribution is a great way to learn, grow, and give back to the community. In this blog, we'll cover everything from finding the right project to making your first pull request.",
    "imageUrl": "https://res.cloudinary.com/demo/image/upload/v1712934772/blogs/opensource-guide.png",
    "tags": ["Open Source", "GitHub", "Contribution", "Beginner"],
    "isPublished": true,
    "publishedAt": "2025-04-12T12:52:38.285Z",
    "authorId": "6618eabc3d20e5b95f3461a2",
    "createdAt": "2025-04-12T12:52:38.300Z",
    "updatedAt": "2025-04-12T12:52:38.300Z",
    "__v": 0
  }
}
```

---

## 🧠 Notes
- The `slug` is automatically created using the blog `title`.
- The `publishedAt` timestamp is only added if `isPublished` is `true`.
- The `authorId` must be a valid MongoDB ObjectId of an authenticated admin/member.
- Blogs are publicly readable. This endpoint is only for **creating** blogs.

Let the frontend use the `slug` to route individual blog pages like `/blog/how-to-contribute-to-open-source`.

---

## 📎 Example Usage in Frontend (Next.js)
```ts
await axios.post("/api/v1/createBlog", blogData, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

