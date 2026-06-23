# Hostel Management System — Project Documentation

A small, dynamic hostel management web app for **customers** (residents) with a minimal **admin** backend to approve their requests. Built as two separate applications — a Laravel API backend and a React single-page-app frontend — that talk to each other over JSON.

---

## 1. Project Overview

The system lets a hostel resident:

- Request a **seat change** (same branch or a different branch) with a live "payable / carry-forward" calculation.
- Maintain a **personal profile** (name, phone, NID, current seat, room, branch).
- See **rent bills**, pay them, and view **payment history**.
- Apply for **leave** and **exit** from the hostel, with automatic notice-period and final-settlement calculation.
- Receive a **live notification feed** (rent reminders, status updates, announcements).

The admin can approve / reject those requests and publish announcements (no admin UI yet — only API endpoints, so the flow is testable end-to-end).

---

## 2. Tech Stack (plain English)

| Layer | Technology | What it does | Why we chose it |
|---|---|---|---|
| Backend language | **PHP 8.4** | The programming language the server runs. | Modern, fast, what Laravel requires. |
| Backend framework | **Laravel 13** | Provides routing, ORM, validation, jobs, etc. | Industry-standard PHP framework. |
| API authentication | **Laravel Sanctum** (SPA mode) | Issues a secure session cookie after login. | Built-in, simple, perfect for first-party SPAs. |
| Database | **MySQL** (can fall back to SQLite) | Stores all data in tables. | What the project standard required. |
| Frontend library | **React 19** | Builds the interactive UI as components. | Most in-demand frontend stack. |
| Build tool | **Vite 8** | Dev server + bundles the JS/CSS for production. | Fast HMR (hot reload), modern toolchain. |
| Routing | **React Router 6** | Maps URLs to React pages (`/dashboard`, `/rent`, etc.). | De-facto standard. |
| HTTP client | **Axios** | Sends API requests with cookies attached. | Cleaner than `fetch`; handles interceptors. |
| Styling | Hand-written **CSS** (no Tailwind runtime) | The look and feel. | Kept lightweight; the styles are already written and small. |
| Process manager (scheduler) | **Laravel Scheduler** (`php artisan schedule:run`) | Runs daily/monthly jobs (rent bills, reminders). | Built into Laravel; no extra service. |

---

## 3. Folder Structure

```
hostel-management-system/                  ← project root
├── app/
│   ├── Http/
│   │   ├── Controllers/                   ← customer-facing controllers
│   │   │   ├── AuthController.php
│   │   │   ├── ProfileController.php
│   │   │   ├── DashboardController.php
│   │   │   ├── BranchController.php
│   │   │   ├── RoomController.php
│   │   │   ├── SeatController.php
│   │   │   ├── SeatChangeController.php
│   │   │   ├── RentController.php
│   │   │   ├── LeaveController.php
│   │   │   ├── ExitController.php
│   │   │   ├── NotificationController.php
│   │   │   └── AnnouncementController.php
│   │   ├── Controllers/Admin/             ← admin-only controllers
│   │   │   ├── AdminDashboardController.php
│   │   │   ├── AdminSeatChangeController.php
│   │   │   ├── AdminLeaveController.php
│   │   │   ├── AdminExitController.php
│   │   │   └── AdminAnnouncementController.php
│   │   └── Middleware/EnsureUserIsAdmin.php
│   └── Models/                            ← one Eloquent model per table
├── database/
│   ├── migrations/                        ← schema definitions
│   └── seeders/DatabaseSeeder.php         ← demo data
├── routes/
│   ├── api.php                            ← all API endpoints
│   └── console.php                        ← scheduled jobs
├── frontend/                              ← the React SPA
│   └── src/
│       ├── api/client.js                  ← axios + Sanctum CSRF
│       ├── contexts/                      ← Auth + Toast providers
│       ├── hooks/                         ← useAuth, useToast, useApi
│       ├── components/shared/             ← reusable UI (cards, tables, pills)
│       ├── pages/
│       │   ├── auth/AuthPage.jsx          ← login + register
│       │   ├── customer/                  ← 8 customer pages
│       │   └── admin/                     ← 3 admin pages
│       ├── utils/                         ← format + error helpers
│       └── styles/app.css                 ← all CSS
└── vite.config.js                         ← Vite dev server + proxy to backend
```

---

## 4. Database Schema

12 tables (3 are Laravel framework defaults: `cache`, `jobs`, `personal_access_tokens`, `password_reset_tokens`, `sessions` — we focus on the 11 business ones).

### 4.1 Relationship map (ERD)

```
                              ┌────────────┐
                              │  branches  │  (hostel locations)
                              └─────┬──────┘
                                    │ 1
                                    │
                                    ▼ N
                              ┌────────────┐
                              │   rooms    │  (each branch has many rooms)
                              └─────┬──────┘
                                    │ 1
                                    │
                                    ▼ N
                              ┌────────────┐         ┌────────────────┐
                              │   seats    │◄────────│ allocations    │
                              └────────────┘  N    1 │  (a user on a  │
                                                     │   seat, at a   │
                                                     │   daily price) │
                                                     └────────┬───────┘
                                                              │ N
                                                              │ 1
                                                              ▼
   ┌────────────┐  1   N  ┌────────────────┐      ┌──────────────┐
   │   users    │────────►│    payments    │      │  rent_bills  │ (monthly)
   └─────┬──────┘         └────────────────┘      └──────────────┘
         │ 1
         │
         ├─────► seat_change_requests    (from_seat → to_seat)
         ├─────► leave_applications
         ├─────► exit_requests
         └─────► notifications
```

### 4.2 Tables

**`branches`** — hostel locations
| Column | Type | Notes |
|---|---|---|
| id | bigint pk | |
| name | string | e.g. "Branch A (Main)" |
| address | string nullable | |
| phone | string nullable | |

**`rooms`** — rooms inside a branch
| Column | Type | Notes |
|---|---|---|
| id | bigint pk | |
| branch_id | fk → branches | |
| name | string | e.g. "A-101" |
| capacity | unsigned int | number of beds in this room (e.g. 2 / 3) |

**`seats`** — individual bookable beds
| Column | Type | Notes |
|---|---|---|
| id | bigint pk | |
| room_id | fk → rooms | |
| label | string | e.g. "A-101-Bed1" |
| price_per_day | decimal(10,2) | daily rate (dynamic — set per seat) |
| status | string | `available` \| `occupied` |

**`users`** — customers + admins
| Column | Type | Notes |
|---|---|---|
| id | bigint pk | |
| name, email (unique), password | string | login fields |
| phone, nid | string nullable | profile |
| role | string default `customer` | `customer` \| `admin` |
| status | string default `active` | `active` \| `on_leave` \| `exited` |
| notice_period_days | int default 7 | used for exit validation |
| deposit_held | decimal(10,2) default 0 | security deposit |
| current_seat_id | bigint nullable | pointer to the seat the user lives on |

**`allocations`** — a user's stay on a particular seat at a particular daily price
| Column | Type | Notes |
|---|---|---|
| id | bigint pk | |
| user_id | fk → users | |
| seat_id | fk → seats | |
| price_per_day | decimal(10,2) | **snapshot** — frozen at the time the allocation started, so price changes later don't rewrite history |
| start_date | date | |
| end_date | date nullable | null = currently active |
| status | string | `active` \| `ended` |
| reason | string | `initial` \| `seat_change` \| `exit` |

> A user can have many allocations over time. At any moment there is exactly one with `status = active`.

**`payments`** — every money movement
| Column | Type | Notes |
|---|---|---|
| id | bigint pk | |
| user_id | fk → users | |
| allocation_id | fk → allocations nullable | |
| amount | decimal(10,2) | |
| type | string | `rent` \| `deposit` \| `adjustment` \| `refund` |
| direction | string | `credit` (money in) \| `debit` (money out, e.g. deposit refund) |
| status | string | `paid` \| `pending` |
| method | string nullable | bkash / nagad / cash / bank |
| paid_at | timestamp nullable | |

**`rent_bills`** — monthly bills
| Column | Type | Notes |
|---|---|---|
| id | bigint pk | |
| user_id | fk → users | |
| period_month | string | e.g. `"2026-06"` |
| amount_due | decimal(10,2) | generated = days_in_month × seat price |
| amount_paid | decimal(10,2) default 0 | |
| due_date | date | |
| status | string | `paid` \| `due` \| `partial` |

**`seat_change_requests`** — pending / completed change requests
| Column | Type | Notes |
|---|---|---|
| id | bigint pk | |
| user_id | fk → users | |
| from_seat_id, to_seat_id | fk → seats | |
| type | string | `same_branch` \| `different_branch` (auto-detected) |
| requested_date | date | |
| balance_before | decimal | snapshot of user's balance at request time |
| payable_amount | decimal | 0 if balance covers, else shortfall |
| status | string | `pending` \| `approved` \| `rejected` |

**`leave_applications`**
| Column | Type | Notes |
|---|---|---|
| id, user_id, start_date, end_date, reason | — | self-explanatory |
| status | string | `pending` \| `approved` \| `rejected` |
| admin_id | fk → users nullable | which admin acted on it |
| approved_at | timestamp nullable | |

**`exit_requests`**
| Column | Type | Notes |
|---|---|---|
| id, user_id, requested_exit_date, reason | — | self-explanatory |
| notice_period_days | int | snapshot |
| notice_valid | bool | true if `days_until_exit >= notice_period_days` |
| rent_payable | decimal | what the user still owes for rent up to exit |
| deposit_refundable | decimal | deposit minus rent owed (never negative) |
| net_payable | decimal | `rent_payable − deposit_refundable`; positive = user pays, negative = user receives |
| status | string | `pending` \| `approved` \| `rejected` |

**`notifications`** — in-app inbox
| Column | Type | Notes |
|---|---|---|
| id | bigint pk | |
| user_id | fk → users nullable | null = broadcast to all customers |
| type | string | `rent_reminder` \| `seat_change` \| `leave` \| `exit` \| `announcement` |
| title, body | string / text | |
| read_at | timestamp nullable | null = unread |

**`announcements`** — public notices (water outage, menu change, etc.)
| Column | Type | Notes |
|---|---|---|
| id, title, body | — | self-explanatory |
| audience | string | `all` \| `customers` |
| published_at | timestamp nullable | |

---

## 5. Authentication Flow (Sanctum SPA)

Sanctum in SPA mode uses two cookies (issued by the backend): `XSRF-TOKEN` and `laravel-session`. The browser sends them automatically on every request because the frontend uses `withCredentials: true`.

```
Browser                          React (Vite :5173)              Laravel API (:8000)
   │                                    │                                │    
   │  1. App loads                      │                                │
   │ ─────────────────────────────────► │                                │
   │                                    │  2. GET /sanctum/csrf-cookie   │
   │                                    │ ─────────────────────────────► │
   │                                    │ ◄──────  Set-Cookie: XSRF...   │
   │                                    │         Set-Cookie: laravel... │
   │                                    │                                │
   │  3. User fills login form          │                                │
   │ ─────────────────────────────────► │                                │
   │                                    │  4. POST /api/auth/login       │
   │                                    │     X-XSRF-TOKEN: <from cookie>│
   │                                    │ ─────────────────────────────► │
   │                                    │ ◄──────  200 { user }          │
   │                                    │                                │
   │  5. Navigate to dashboard          │                                │
   │ ─────────────────────────────────► │  6. GET /api/dashboard         │
   │                                    │     Cookie: XSRF + session     │
   │                                    │ ─────────────────────────────► │
   │                                    │ ◄──────  200 { balance, ... }  │
```

Middleware on the API side:
- `auth:sanctum` — requires a valid session, blocks anonymous requests.
- `is_admin` — additionally requires `users.role = 'admin'`, used for `/api/admin/*` routes.

---

## 6. Core Feature Workflows

### 6.1 Seat Change
1. Customer picks a new (available) seat on the Seat Change page.
2. The app calls `POST /api/seat-change-requests/preview` which **does not create** the request — it just computes: balance, remaining days, new total cost, **payable amount** (shortfall) or **carry-forward** (excess).
3. The customer submits → `POST /api/seat-change-requests` (status = `pending`).
4. Admin calls `PUT /api/admin/seat-change-requests/{id}/approve` → the old allocation is closed, the new seat is marked occupied, a new allocation is created at the new rate, and the user is notified.

### 6.2 Customer Profile
- `GET /api/profile` — returns user, current seat, balance, consumed rent.
- `PUT /api/profile` — updates name, phone, nid (email and role are read-only).
- The Dashboard (`GET /api/dashboard`) surfaces the same info as cards on the home page.

### 6.3 Rent
- `GET /api/rent/bills` — all monthly bills with status pills (`paid` / `due` / `partial`).
- `GET /api/rent/history` — every `payments` row for this user.
- `POST /api/rent/pay` — creates a `credit` payment, updates the bill's `amount_paid` and `status`.
- A scheduled job (`hostel:generate-rent-bills`, 1st of each month) creates the next month's bill.
- Another scheduled job (`hostel:send-rent-reminders`, daily 08:00) creates a notification for any unpaid bill whose `due_date` is within 3 days.

### 6.4 Leave
- `POST /api/leave-applications` — submits with start/end date + reason (status = `pending`).
- Admin approves / rejects via `/api/admin/leave-applications/{id}/approve|reject`.
- The customer's leave history shows the status pill.

### 6.5 Exit
- `POST /api/exit-requests/preview` — calculates settlement **before** submitting. The customer sees: notice period, days until exit, whether the notice is valid, rent payable, deposit refundable, net payable.
- `POST /api/exit-requests` — submits. The backend **rejects with 422** if the notice period is not met.
- On admin approve: the active allocation is ended at the exit date, the seat is freed, the user is set to `status = exited`, a refund payment is created for the deposit portion, and a notification is sent.

### 6.6 Notifications
- Personal + broadcast notifications are merged in `GET /api/notifications`.
- `PUT /api/notifications/{id}/read` and `POST /api/notifications/read-all`.
- Customers see published announcements in their `GET /api/announcements`.

---

## 7. Payment Adjustment Logic (the wallet model)

Every customer has a **virtual wallet** = credits minus consumed rent.

```
balance  =  Σ (credit payments, status = paid)  −  consumed_rent
```

`consumed_rent` is the sum, over every allocation, of `days_elapsed × price_per_day` (the price is **frozen per allocation**, so historical rate changes never distort past consumption).

### Worked example (from the original spec)

A customer books a 500 BDT/day seat for 3 days and pays 1500 up front. After 2 days they switch to a 300 BDT/day seat.

| Day | Seat rate | Cost that day | Running consumed | Wallet |
|---|---|---|---|---|
| 1 | 500 | 500 | 500 | 1000 |
| 2 | 500 | 500 | 1000 | 500 |
| 3 (changed) | 300 | 300 | 1300 | 200 |
| 4 (extended) | 300 | 300 | 1600 | 0 (paid 100 extra) |

**Result:** the user stayed 4 days, total cost 1600, total paid 1600 (1500 originally + 100 to extend). The "no refund" rule means the 200 BDT excess from day 3 was **carried forward** as credit toward day 4 — never refunded in cash.

### Exit settlement

```
rent_payable      = max(0, consumed_rent_up_to_exit  −  total_credits)
deposit_refundable = max(0, deposit_held  −  rent_payable)
net_payable       = rent_payable  −  deposit_refundable
```

`net_payable` is positive when the user still owes money and negative when the hostel owes the user (deposit refund only — never a rent refund).

---

## 8. API Endpoints (quick reference)

### Public
| Method | Path | Purpose |
|---|---|---|
| GET | `/sanctum/csrf-cookie` | Issue CSRF + session cookies |
| POST | `/api/auth/register` | Create a new customer account |
| POST | `/api/auth/login` | Log in (returns user) |

### Authenticated (any logged-in user)
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/logout` | End session |
| GET | `/api/auth/me` | Current user |
| GET / PUT | `/api/profile` | Show / update profile |
| GET | `/api/dashboard` | Home page data |
| GET | `/api/branches`, `/rooms`, `/seats` | Browse hostel |
| POST | `/api/seat-change-requests/preview` | Compute payable (no save) |
| GET / POST | `/api/seat-change-requests` | List / submit |
| GET | `/api/seat-change-requests/{id}` | Detail |
| GET | `/api/rent/bills` | Monthly bills |
| GET | `/api/rent/history` | Payment history |
| POST | `/api/rent/pay` | Record a payment |
| GET / POST | `/api/leave-applications` | List / submit |
| GET | `/api/leave-applications/{id}` | Detail |
| POST | `/api/exit-requests/preview` | Settlement preview |
| GET / POST | `/api/exit-requests` | List / submit |
| GET | `/api/exit-requests/{id}` | Detail |
| GET | `/api/notifications` | Inbox |
| PUT | `/api/notifications/{id}/read` | Mark one read |
| POST | `/api/notifications/read-all` | Mark all read |
| GET | `/api/announcements`, `/api/announcements/{id}` | Browse notices |

### Admin only (`role = admin`)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/dashboard` | Stats + pending queues |
| GET / PUT | `/api/admin/seat-change-requests[/{id}/approve\|reject]` | Manage seat changes |
| GET / PUT | `/api/admin/leave-applications[/{id}/approve\|reject]` | Manage leaves |
| GET / PUT | `/api/admin/exit-requests[/{id}/approve\|reject]` | Manage exits (approve ends allocation + settles) |
| GET / POST | `/api/admin/announcements` | Publish notices |
| DELETE | `/api/admin/announcements/{id}` | Remove a notice |

---

## 9. Scheduled Tasks

| Command | Cadence | Purpose |
|---|---|---|
| `hostel:generate-rent-bills` | 00:05 on the 1st of every month | Create the next month's `rent_bills` row for every active customer. |
| `hostel:send-rent-reminders` | 08:00 every day | Create a `rent_reminder` notification for any unpaid bill whose `due_date` is ≤ 3 days away. |
| `hostel:process-daily-charges` | 00:10 every day | Notify users whose balance is below one day of rent. |

All three are registered in `routes/console.php` via Laravel's `Schedule` facade. The host machine needs a cron entry: `* * * * * cd /path && php artisan schedule:run >> /dev/null 2>&1`.

---

## 10. How to Run

### Prerequisites
- PHP 8.4 with `pdo_mysql` (or `pdo_sqlite`)
- MySQL running locally with a database called `hostel-management-db`
- Composer
- Node.js 20+ and npm

### Backend
```bash
cd hostel-management-system
composer install
php artisan migrate --seed       # creates tables + demo data
php artisan serve --port=8000   # API at http://localhost:8000
php artisan schedule:work       # in another terminal — runs the scheduler
```

### Frontend
```bash
cd hostel-management-system/frontend
npm install
npm run dev                     # SPA at http://localhost:5173
```

Vite is configured to **proxy** `/api` and `/sanctum` to `http://localhost:8000`, so the frontend can use relative URLs and still talk to the backend. No CORS gymnastics needed in development.

### Demo credentials (from the seeder)
| Role | Email | Password |
|---|---|---|
| Customer | `rahim@hostel.test` | `password123` |
| Customer | `karim@hostel.test` | `password123` |
| Admin | `admin@hostel.test` | `password123` |

The customer `rahim@hostel.test` has 2 demo items already submitted so you can see the UI populated without doing anything.

---

## 11. Known Limitations / Future Work

- **Notification polling is not yet wired up.** Every page fetches notifications once on mount. The "real-time preferred" requirement is partially met (the backend scheduled job creates new notifications automatically); only the frontend auto-refresh is pending. The fix is a single `useNotificationPolling` hook that hits `/api/notifications` every ~30 s and is mounted once in the app shell.
- **Admin panel has API only**, no UI. The admin endpoints exist so the approve/reject flow is testable with `curl`/Postman. A proper admin SPA can be built later from the same `frontend/` folder.
- **Business logic lives inside controllers** (per the original brief) — no `FormRequest`, `Resource`, or `Service` classes. When the codebase grows, extracting a `BillingService` will reduce duplication between `SeatChangeController`, `ExitController`, and `AdminExitController`.
- **No payment-gateway integration.** The "Pay rent" form records a payment as `paid` immediately; in production this would be triggered by a bKash / Nagad / Stripe webhook.

---
