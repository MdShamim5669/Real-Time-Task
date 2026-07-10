# Realtime Task Dashboard & Mess Manager

A comprehensive full-stack workspace organized into `frontend` (Next.js & React/Vite layout) and `backend` (Express.js & Prisma ORM) to support seamless, modular development and cloud deployment.

## Repository Structure

```
Realtime Task Dashboard/
│
├── frontend/                 # Client-side web application
│   ├── app/                  # Next.js App Router structure
│   │   ├── (auth)/           # Authentication views (Login, Setup)
│   │   └── (dashboard)/      # Protected dashboard routes (Meals, Expenses, Deposits, Roster, Members, History)
│   ├── components/           # Reusable UI component modules
│   ├── src/                  # Main active application sources (Vite + React)
│   ├── tsconfig.json         # TypeScript compiler configuration
│   └── package.json          # Frontend dependencies and scripts
│
├── backend/                  # Server-side application
│   ├── src/                  # Express.js application code
│   │   ├── config/           # Server configurations (Database, env variables)
│   │   ├── modules/          # Business logic domain domains (Auth, Member, Meal, Expense, Deposit, Roster, Period)
│   │   ├── middlewares/      # Express middleware functions (Auth, Role, Error handlers)
│   │   └── utils/            # Shared helper functions (JWT tokenizers, Password hashing)
│   ├── prisma/               # Prisma database schemas and migration files
│   └── package.json          # Backend dependencies and scripts
│
└── package.json              # Root project workspace delegator
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn
- PostgreSQL (or alternative relational database supported by Prisma)

### Running the Application

1. **Install Dependencies**:
   Install root and sub-project dependencies:
   ```bash
   npm install
   ```

2. **Database Migration** (Backend):
   Configure your database URL in `backend/.env` and execute database migrations:
   ```bash
   cd backend
   npx prisma migrate dev
   ```

3. **Running the Development Servers**:
   - To run the **frontend** in development:
     ```bash
     npm run dev
     ```
   - To run the **backend** in development:
     ```bash
     cd backend
     npm run dev
     ```

## Environment Details

- **Database**: PostgreSQL mapped via Prisma ORM
- **Backend API**: Express server running on port `5000` (or configured via backend `.env`)
- **Frontend App**: Vite React / Next.js layout served locally
