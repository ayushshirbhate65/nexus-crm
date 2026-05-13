# Nexus CRM - Customer Service Management Software

A professional CRM built with React, Node.js, and MongoDB.

## Features
- **Dashboard**: Real-time stats, interactive charts (Recharts), and recent activity.
- **Customer Management**: Full list with search, filtering, and status updates.
- **Follow-ups**: Dedicated view for pending and overdue calls.
- **Role-based Access**: Admin, Employee, and Senior Manager roles.
- **Google Sheets Integration**: (Simulated) Manual and auto-sync support.
- **Activity Logs**: Audit trail for user actions.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Lucide React, Recharts, React Router.
- **Backend**: Node.js, Express, JWT, Mongoose.
- **Database**: MongoDB (Logic included in server directory).

## Setup Instructions

### Frontend
1. Navigate to the project root.
2. Install dependencies: `npm install`
3. Run dev server: `npm run dev`

### Backend
1. Navigate to the `server` directory (or run from root if configured).
2. Install dependencies: `npm install express mongoose dotenv cors jsonwebtoken`
3. Configure `.env` with `MONGODB_URI` and `JWT_SECRET`.
4. Run server: `node server/index.js`

## Deployment
1. Build frontend: `npm run build`
2. Deploy the `dist` folder to your favorite host (Vercel/Netlify).
3. Deploy the Node.js server to a platform like Heroku, Render, or Railway.

## Docker Setup
A basic Dockerfile for the frontend:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host"]
```
"# nexus-crm" 
