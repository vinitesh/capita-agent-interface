# Requirements: User Authentication & Management for Capita Agent Interface

## Requirement 1: Authentication Endpoints

### Description
The backend must provide login and session validation endpoints so users can authenticate and maintain their session.

### Acceptance Criteria
- 1.1 `POST /api/auth/login` accepts `{ username, password }` and returns `{ token, user: { username, role } }` on valid credentials
- 1.2 `POST /api/auth/login` returns 401 with `{ error: "Invalid credentials" }` for wrong password or non-existent username
- 1.3 `POST /api/auth/login` returns 400 if username or password is missing from the request body
- 1.4 `GET /api/auth/me` returns `{ username, role }` when a valid Bearer token is provided in the Authorization header
- 1.5 `GET /api/auth/me` returns 401 for expired, malformed, or missing tokens

## Requirement 2: Auth Middleware

### Description
All API routes except the login endpoint must be protected by JWT authentication middleware.

### Acceptance Criteria
- 2.1 All `/api/*` routes EXCEPT `/api/auth/login` require a valid JWT in the `Authorization: Bearer <token>` header
- 2.2 The middleware extracts `{ username, role }` from the token and attaches it to `req.user`
- 2.3 Requests without a token receive a 401 response with `{ error: "Authentication required" }`
- 2.4 Requests with an expired token receive a 401 response
- 2.5 Requests with a malformed or tampered token receive a 401 response

## Requirement 3: Admin User Management Endpoints

### Description
Admin users must be able to list, create, and delete user accounts via dedicated API endpoints.

### Acceptance Criteria
- 3.1 `GET /api/users` returns an array of `{ username, role, createdAt }` objects (passwordHash is never included)
- 3.2 `POST /api/users` accepts `{ username, password, role? }` and creates a new user with a bcrypt-hashed password; role defaults to `"user"` if omitted
- 3.3 `POST /api/users` returns 400 with `{ error: "Username already exists" }` if the username is taken
- 3.4 `POST /api/users` returns 400 if username or password is missing
- 3.5 `DELETE /api/users/:username` removes the specified user from the database
- 3.6 `DELETE /api/users/:username` returns 400 with `{ error: "Cannot delete your own account" }` if the admin tries to delete themselves
- 3.7 All `/api/users` endpoints return 403 with `{ error: "Admin access required" }` for non-admin users

## Requirement 4: User Data Storage

### Description
User accounts must be stored in a dedicated DynamoDB table with proper schema and constraints.

### Acceptance Criteria
- 4.1 A DynamoDB table named `a2a-users` (configurable via `USERS_TABLE` env var) stores user records
- 4.2 Each user record contains: `username` (partition key), `passwordHash`, `role` ("admin" or "user"), `createdAt` (ISO 8601)
- 4.3 Usernames are unique, enforced by the partition key and conditional PutItem
- 4.4 Passwords are stored as bcrypt hashes with cost factor 10, never in plaintext

## Requirement 5: Default Admin Seeding

### Description
A default admin account must be created on first startup to bootstrap the system.

### Acceptance Criteria
- 5.1 On server startup, if the `a2a-users` table is empty, a default user `{ username: "admin", password: "admin", role: "admin" }` is created with a hashed password
- 5.2 If the table already contains users, the seed function makes no changes
- 5.3 The seed result is logged to the console ("Default admin user created" or "Users already exist, skipping seed")

## Requirement 6: JWT Configuration

### Description
JWT tokens must be properly configured with appropriate secret management and expiry.

### Acceptance Criteria
- 6.1 JWTs are signed using a secret from the `JWT_SECRET` environment variable
- 6.2 JWT payload contains `{ username, role, iat, exp }`
- 6.3 Tokens expire 24 hours after issuance
- 6.4 The `JWT_SECRET` environment variable is added to `.env`, `docker-compose.yml`, and backend `Dockerfile` documentation

## Requirement 7: Frontend Login Page

### Description
The frontend must display a login page for unauthenticated users.

### Acceptance Criteria
- 7.1 When no valid token exists in localStorage, the app displays a centered login form with username and password fields and a submit button
- 7.2 On successful login, the JWT is stored in localStorage and the user is shown the main app
- 7.3 On failed login, an error message is displayed on the login form
- 7.4 On app mount, if a token exists in localStorage, it is validated via `GET /api/auth/me` before showing the app
- 7.5 If token validation fails (401), the token is cleared from localStorage and the login page is shown

## Requirement 8: Frontend Auth Context

### Description
A React context must provide authentication state and actions to all components.

### Acceptance Criteria
- 8.1 An `AuthProvider` wraps the entire app and provides `{ user, token, isAuthenticated, isAdmin, isLoading, login, logout }`
- 8.2 `isAdmin` is `true` when `user.role === "admin"`
- 8.3 `isLoading` is `true` during initial token validation on mount
- 8.4 `logout()` clears the token from localStorage and resets user state
- 8.5 All API calls include the `Authorization: Bearer <token>` header when a token is available
- 8.6 Any 401 API response triggers an automatic logout

## Requirement 9: Frontend User Management Panel

### Description
Admin users must see a user management panel in the sidebar to add and remove users.

### Acceptance Criteria
- 9.1 The UserManagement component is rendered in the sidebar only when `isAdmin` is `true`
- 9.2 The panel displays a table of users with columns: username, role, createdAt
- 9.3 An "Add User" form allows entering username, password, and role (dropdown: user/admin)
- 9.4 A "Remove" button on each user row triggers a deletion (with confirmation)
- 9.5 The currently logged-in admin cannot remove themselves (button disabled or hidden)
- 9.6 The user list refreshes after add or remove operations

## Requirement 10: App Renaming

### Description
All user-facing references to "A2A Chat" must be renamed to "Capita Agent Interface."

### Acceptance Criteria
- 10.1 The `<title>` in `frontend/index.html` is changed from "A2A Chat Client" to "Capita Agent Interface"
- 10.2 The sidebar header `<h2>` in `Sidebar.jsx` is changed from "A2A Chat" to "Capita Agent Interface"
- 10.3 No user-facing strings in the frontend contain "A2A Chat" after the change

## Requirement 11: Environment & Deployment Configuration

### Description
New environment variables and dependencies must be added to support authentication.

### Acceptance Criteria
- 11.1 `JWT_SECRET` is added to `backend/.env` with a placeholder value
- 11.2 `USERS_TABLE=a2a-users` is added to `backend/.env`
- 11.3 `JWT_SECRET` and `USERS_TABLE` are added to the `api` service environment in `docker-compose.yml`
- 11.4 `jsonwebtoken` and `bcryptjs` packages are added to backend `package.json`
