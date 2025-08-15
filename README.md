# Smart Library Platform

A modern web-based library management system for readers, staff, and admins. Built with React (frontend) and Node.js/Express (backend), supporting MySQL and MongoDB.

---

## Features

- User authentication (register, login)
- Browse, search, and borrow books
- Admin dashboard for managing books, users, and logs
- Real-time updates for borrowed books
- Book reviews and analytics
- Responsive UI

---

## Project Structure

```
/
├── backend/         # Node.js/Express backend
│   ├── src/         # Controllers, routes, services
│   ├── db/          # SQL schema, sample data, scripts
│   └── uploads/     # Uploaded book images
├── src/             # React frontend
│   ├── components/  # UI components
│   ├── pages/       # App pages (Login, Register, Dashboard, etc.)
│   ├── services/    # API service modules
│   └── utils/       # Utility functions
├── public/          # Static assets
├── package.json     # Frontend dependencies
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js (v16+)
- npm
- MySQL database (see `.env` for connection string)

---

### 1. Clone the Repository

```sh
git clone https://github.com/your-username/smart-library-platform.git
cd smart-library-platform
```

---

### 2. Install Dependencies

**Open two terminals:**

#### Terminal 1 (Frontend - in project root):

```sh
npm install
```

#### Terminal 2 (Backend - in `backend` folder):

```sh
cd backend
npm install
```

---

### 3. Database Setup

**In the `backend` folder, you can run:**

- **Safe migrate (apply migrations, keep data):**
  ```sh
  node db/run-sql.cjs
  ```
- **Full reset (drops & recreates tables, erases data):**
  ```sh
  node db/run-sql.cjs --reset
  ```

Edit your database connection strings in `backend/.env` as needed.

---

### 4. Running the App

**Keep both terminals open:**

#### Terminal 1 (Frontend):

```sh
npm run dev
```

- Runs the React frontend at [http://localhost:5173](http://localhost:5173)

#### Terminal 2 (Backend):

```sh
npm run dev
```

- Runs the backend API at [http://localhost:4000](http://localhost:4000)

---

## Default Admin/Staff Accounts

You can log in with the following default credentials (see `backend/.env`):

- **Admin:**  
  Email: `admin@library.com`  
  Password: `admin123`
- **Staff:**  
  Email: `staff@library.com`  
  Password: `staff123`

---

## Environment Variables

See `backend/.env` for all configuration options, including database URLs, JWT secret, and default accounts.

---

## Scripts

- `npm run dev` — Start development server (frontend or backend)
- `npm run build` — Build frontend for production
- `node db/run-sql.cjs` — Safe migrate database
- `node db/run-sql.cjs --reset` — Full reset of database

---

## License

MIT

---

*For more details, see the source code and comments