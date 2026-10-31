# service-hub-backend

Backend REST API server for Service Hub platform built with Express, MongoDB/Mongoose, JWT Authentication, Cloudinary file uploads, and Google Gemini AI integration.

## Features
- **User Authentication & Role Management**: Citizen, Service Provider, Admin roles with JWT authentication.
- **Service Request & Booking Management**: Create, assign, track status, and complete service requests.
- **Reviews & Ratings**: Add and fetch reviews for completed services.
- **AI Assistant Integration**: Gemini AI chatbot for citizen inquiries and issue assistance.
- **File Uploads**: Cloudinary integration for complaint media and profile images.

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```bash
   cp .env.example .env
   # Update variables accordingly
   ```

3. Seed initial database data (optional):
   ```bash
   node seed.js
   ```

4. Start development server:
   ```bash
   npm run dev
   # or
   npm start
   ```

