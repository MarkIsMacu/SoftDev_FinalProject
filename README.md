# Project Setup & Run Guide

## Requirements
- Node.js (LTS recommended)
- npm
- PostgreSQL database
- Git (optional)

---

## 1. Clone the Repository

```bash
git clone <repo-url>
cd <project-folder>
```

---

## 2. Install Dependencies

> Skip this step if dependencies are already installed.

Open 2 terminals and run:

## Terminal 1 - Frontend
```bash
cd FRONTEND
npm install
```

## Terminal 2 - Backend
```bash
cd BACKEND
npm install
```

---

## 3. Run the Project

Open 2 terminals (or 3 if you want Prisma Studio):

## Terminal 1 - Frontend
```bash
cd FRONTEND
npm run dev
```

## Terminal 2 - Backend
```bash
cd BACKEND
npm run dev
```

## Terminal 3 - Prisma Studio *(optional)*
```bash
cd BACKEND
npx prisma studio
```

---

## 4. Database Setup
 
1. Download the backup file
2. Open **pgAdmin 4**
3. Create a new database
4. Right-click the new database and select **Restore**
5. Choose the downloaded backup file and confirm to restore