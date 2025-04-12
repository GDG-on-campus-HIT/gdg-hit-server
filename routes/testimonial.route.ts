import express from 'express';
import { authorizeRoles, isAuthenticate } from './../middleware/auth';
import { addTestimonial, updateTestimonial, deleteTestimonial, getTestimonials, getTestimonialById } from '../controllers/testimonial.controller';

const testimonialRouter = express.Router();

// Add a new testimonial
testimonialRouter.post('/testimonial', addTestimonial);

// Update a testimonial by ID
testimonialRouter.put('/testimonial/:id', isAuthenticate, authorizeRoles("admin"), updateTestimonial);

// Delete a testimonial by ID
testimonialRouter.delete('/testimonial/:id', isAuthenticate, authorizeRoles("admin"), deleteTestimonial);

// Get all testimonials
testimonialRouter.get('/testimonial', getTestimonials);

// Get a single testimonial by ID
testimonialRouter.get('/testimonial/:id', getTestimonialById);

export default testimonialRouter;
