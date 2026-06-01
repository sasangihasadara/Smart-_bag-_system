# Smart Bag System

This repository contains the Smart Bag System project with a React frontend and an Express/MongoDB backend.

## Project Structure

- `BackEnd/` — Node.js API server using Express and MongoDB
- `FrontEnd/packpal/` — React application for the user interface

## Prerequisites

- Node.js 18+ recommended
- npm
- MongoDB instance or Atlas connection string

## Backend Setup

1. Open a terminal and go to the backend folder:

```bash
cd BackEnd
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in `BackEnd` if needed and add your configuration values. Example:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/your-db-name
JWT_SECRET=your-secret
```

4. Start the backend server:

```bash
npm run dev
```

or in production mode:

```bash
npm start
```

## Frontend Setup

1. Open a terminal and go to the frontend folder:

```bash
cd FrontEnd/packpal
```

2. Install dependencies:

```bash
npm install
```

3. Start the React app:

```bash
npm start
```

4. Build for production:

```bash
npm run build
```

## Notes

- The frontend uses React Router v7.
- The backend runs on Express v5 and connects to MongoDB with Mongoose.
- If you need to update API base URLs, check the frontend config or Axios requests in `FrontEnd/packpal/src`.

## Troubleshooting

- If the frontend fails to start, ensure the backend is not blocking the desired API port.
- If the backend cannot connect to MongoDB, verify `MONGO_URI` and MongoDB availability.

---

If you want, I can also add a short `CONTRIBUTING.md` or document the main API routes next.