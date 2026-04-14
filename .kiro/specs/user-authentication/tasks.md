# Tasks: User Authentication & Management for Capita Agent Interface

## Task 1: Backend Dependencies & Environment
- [x] 1.1 Install `bcryptjs` in `a2a-client/backend/`
- [x] 1.2 Add `USERS_TABLE=a2a-users` to `a2a-client/backend/.env` and `docker-compose.yml`

## Task 2: User Service & Seeder
- [x] 2.1 Create `a2a-client/backend/src/services/userService.js` with `createUser`, `getUserByUsername`, `listUsers`, `deleteUser` using `a2a-users` DynamoDB table
- [x] 2.2 Create `a2a-client/backend/src/services/seedAdmin.js` that seeds admin/admin if table is empty

## Task 3: Backend Routes
- [x] 3.1 Create `a2a-client/backend/src/routes/auth.js` with `POST /login` (validate username+password via bcrypt, return user info) and `POST /validate` (check if username exists, return user info)
- [x] 3.2 Create `a2a-client/backend/src/routes/users.js` with `GET /` (list), `POST /` (create), `DELETE /:username` (delete, prevent self-deletion)
- [x] 3.3 Register routes in server.js, call seedDefaultAdmin() on startup

## Task 4: Frontend Auth & API
- [x] 4.1 Create `a2a-client/frontend/src/hooks/useAuth.js` — stores user in state + localStorage, provides login/logout/isAdmin
- [x] 4.2 Update `a2a-client/frontend/src/services/api.js` — add `login()`, `listUsers()`, `createUser()`, `deleteUser()`

## Task 5: Frontend Login Page
- [x] 5.1 Create `a2a-client/frontend/src/components/LoginPage.jsx` with centered form
- [x] 5.2 Add login page styles to `App.css`

## Task 6: Frontend App Shell & User Management
- [x] 6.1 Update App.jsx — show LoginPage when not authenticated, pass auth to Sidebar
- [x] 6.2 Create `a2a-client/frontend/src/components/UserManagement.jsx` with user list, add form, remove button
- [x] 6.3 Update Sidebar.jsx — show username + Logout, render UserManagement for admin, rename to "Capita Agent Interface"
- [x] 6.4 Change `<title>` in index.html to "Capita Agent Interface"
