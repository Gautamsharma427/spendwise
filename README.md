# SpendWise

### SaaS Spend Intelligence & License Optimization Platform

> Stop paying for software nobody uses.

SpendWise is a SaaS spend management platform that helps organizations discover software subscriptions, identify unused licenses, review category overlap, monitor upcoming renewals, and optimize recurring software expenditure.

It provides businesses with centralized visibility into their SaaS ecosystem and actionable recommendations to eliminate unnecessary spending without disrupting employee productivity.

---

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Our Solution](#our-solution)
4. [Product Vision](#product-vision)
5. [Core Features](#core-features)
6. [How It Works](#how-it-works)
7. [System Architecture](#system-architecture)
8. [Technology Stack](#technology-stack)
9. [Application Modules](#application-modules)
10. [Mathematical Recommendation Engine](#mathematical-recommendation-engine)
11. [Database Design](#database-design)
12. [Data Import and CSV Format](#data-import-and-csv-format)
13. [API Design](#api-design)
14. [User Interface and Experience](#user-interface-and-experience)
15. [Security and Privacy](#security-and-privacy)
16. [Project Structure](#project-structure)
17. [Installation and Setup](#installation-and-setup)
18. [Environment Variables](#environment-variables)
19. [Development Roadmap](#development-roadmap)
20. [Future Enhancements](#future-enhancements)
21. [Success Metrics](#success-metrics)
22. [Target Users](#target-users)
23. [Contributing](#contributing)
24. [License](#license)

---

# 1. Overview

Organizations increasingly depend on dozens or even hundreds of SaaS applications to manage their operations.

However, as companies grow, their software ecosystem becomes fragmented.

Different departments independently purchase subscriptions, employees retain licenses they no longer need, free trials silently become paid subscriptions, and redundant applications continue consuming organizational budgets.

Most organizations lack a centralized system that connects software expenditure with actual application utilization.

SpendWise addresses this problem.

It analyzes software expenditure and license utilization data to identify unnecessary spending and provide intelligent cost optimization recommendations.

### Key capabilities

- Centralized SaaS subscription management.
- Automated identification of inactive licenses.
- SaaS expenditure analytics.
- Duplicate and overlapping application detection.
- Upcoming subscription renewal monitoring.
- Deterministic cost optimization recommendations.
- Potential and realized savings tracking.
- Downloadable financial reports.

### Core value proposition

**SpendWise transforms fragmented SaaS expenditure into actionable financial intelligence.**

---

# 2. Problem Statement

Companies experience significant software expenditure inefficiencies due to a lack of centralized SaaS visibility.

The major problems include:

### 2.1 Unused Licenses

Organizations continue paying for licenses assigned to employees who have left the company or stopped using the application.

### 2.2 Forgotten Subscriptions

Free trials convert into paid subscriptions, and recurring payments continue even when the software is no longer needed.

### 2.3 Redundant Applications

Different departments purchase applications that offer overlapping functionality.

For example:
- Department A uses Asana.
- Department B uses Monday.com.
- Department C uses Trello.

The organization might be paying for three different project management solutions without understanding whether all three are necessary.

### 2.4 Overprovisioned Licenses

Employees receive premium subscription tiers even when they only require basic functionality.

### 2.5 Lack of Financial Visibility

Finance teams often depend on spreadsheets, invoices, and manual expense tracking.

This makes it difficult to understand:

- Total SaaS expenditure.
- Department-wise software spending.
- Cost per employee.
- Unused license expenditure.
- Upcoming renewal commitments.
- Potential cost optimization opportunities.

### 2.6 No Proactive Optimization

Most organizations identify unnecessary subscriptions only after reviewing financial statements or conducting periodic audits.

SpendWise aims to make optimization continuous rather than reactive.

---

# 3. Our Solution

SpendWise provides a centralized analysis layer that connects subscription expenditure, license utilization, and application information.

The platform follows six major stages:

1. **Discover:** Collect software subscription information from uploaded financial records and connected sources.
2. **Analyze:** Process license assignments, employee activity, and subscription expenditure.
3. **Detect:** Identify inactive licenses, redundant applications, and unusual expenditure.
4. **Recommend:** Generate actionable optimization recommendations.
5. **Approve:** Allow authorized administrators to review and approve proposed changes.
6. **Measure:** Track the estimated and verified savings generated through optimization.

The initial MVP will use CSV-based data ingestion and sample datasets to demonstrate this workflow.

Future versions will support direct SaaS provider integrations.

---

# 4. Product Vision

Our long-term vision is to become an intelligent financial operations platform for managing organizational software expenditure.

### Mission

Help organizations make smarter software purchasing decisions, eliminate unnecessary recurring expenses, and maximize the value of their existing SaaS investments.

### Product principles

- Data-driven decisions over assumptions.
- Explainable mathematical recommendations.
- Financial transparency.
- Human approval before destructive actions.
- Security-first architecture.
- Simple and intuitive user experience.

---

# 5. Core Features

## 5.1 Centralized Dashboard

The dashboard provides an overview of an organization's SaaS ecosystem.

Key metrics:

| Metric | Description |
|---|---|
| Total Monthly Spend | Combined monthly subscription expenditure |
| Annualized Spend | Projected annual subscription expenditure |
| Potential Savings | Estimated achievable cost reductions |
| Realized Savings | Savings verified after approved changes |
| Total Applications | Number of tracked SaaS applications |
| Total Licenses | Number of purchased or assigned licenses |
| Unused Licenses | Licenses meeting inactivity criteria |
| Upcoming Renewals | Subscriptions approaching renewal |

The dashboard should also include:

- Monthly spending trends.
- Department-wise expenditure.
- Subscription category breakdown.
- License utilization charts.
- Recent recommendations.
- Upcoming renewal alerts.

## 5.2 Subscription Management

A centralized interface for managing software subscriptions.

Each subscription should contain:

- Application name.
- Vendor.
- Category.
- Monthly cost.
- Billing frequency.
- Total purchased seats.
- Assigned seats.
- Active seats.
- Subscription owner.
- Department.
- Renewal date.
- Subscription status.

Supported operations:

- Add subscription.
- Edit subscription.
- Delete subscription.
- Search subscriptions.
- Filter by category.
- Sort by expenditure.
- View subscription details.

## 5.3 Unused License Detection

The platform analyzes employee activity to identify potentially unused licenses.

Example:

An organization purchases 100 Slack licenses.

- 100 licenses purchased.
- 85 licenses assigned.
- 65 active users.
- 20 inactive assigned users.
- 15 unassigned licenses.

The platform identifies 35 potentially reclaimable licenses.

Detection rules:

| Inactivity | Classification |
|---|---|
| 0–30 days | Active |
| 31–60 days | Low activity |
| 61–90 days | Potentially unused |
| 90+ days | High-priority review |

These thresholds must be configurable.

The system should not automatically revoke licenses based exclusively on inactivity. Administrators should review recommendations before taking action.

## 5.4 Duplicate SaaS Detection

Identify applications with similar or overlapping functionality.

Example:

| Application | Category |
|---|---|
| Asana | Project Management |
| Monday.com | Project Management |
| Trello | Project Management |
| Notion | Documentation and Collaboration |

The system should identify potential functional overlap and highlight opportunities for consolidation.

Detection can use:

- Application categories.
- Application descriptions.
- Feature similarities.
- Department usage.
- Subscription costs.

Applications should be flagged as potentially redundant, not automatically classified as unnecessary.

## 5.5 Mathematical Recommendations

An explainable mathematical recommendation engine analyzes recorded spend, seats, activity dates, and renewal dates.

Example recommendations:

**Recommendation 1: Reclaim inactive licenses**

Application: Slack

Finding: 20 assigned licenses have not been used for more than 90 days.

Suggested action: Review inactive licenses and reclaim those no longer required.

Estimated savings: $160/month.

**Recommendation 2: Review redundant applications**

Applications: Asana and Monday.com.

Finding: Both applications are used for project management across overlapping departments.

Suggested action: Evaluate whether one platform can serve both departments.

Estimated savings: To be determined after migration and contract review.

**Recommendation 3: Review premium subscriptions**

Application: Figma.

Finding: Several users may not require premium functionality.

Suggested action: Review usage requirements and consider lower-cost license tiers.

Estimated savings: Depends on eligible seat downgrades.

## 5.6 Renewal Monitoring

Monitor upcoming subscription renewal dates.

Alert categories:

- Renewal within 30 days.
- Renewal within 14 days.
- Renewal within 7 days.
- Renewal overdue.

The system should help administrators review subscriptions before the next billing cycle.

## 5.7 Savings Reports

Generate reports containing:

- Total SaaS expenditure.
- Potential savings.
- Realized savings.
- Unused license expenditure.
- Subscription category breakdown.
- Optimization history.
- Approved recommendations.
- Pending recommendations.

Reports should be downloadable in CSV format in the MVP, with PDF support planned.

---

# 6. How It Works

The primary workflow:

```text
       COMPANY DATA
            |
            v
    CSV / DATA IMPORT
            |
            v
     DATA PROCESSING
            |
            v
    SUBSCRIPTION ANALYSIS
            |
      +-----+------+
      |            |
      v            v
 UNUSED LICENSE   DUPLICATE
 DETECTION        DETECTION
      |            |
      +-----+------+
            |
            v
   RULE-BASED MATH
       ENGINE
            |
            v
    RECOMMENDATIONS
            |
            v
    ADMIN APPROVAL
            |
            v
   OPTIMIZATION ACTION
            |
            v
     SAVINGS TRACKING
```

The system should distinguish between:

- Detected issues.
- Estimated savings.
- Approved recommendations.
- Completed optimization actions.
- Verified financial savings.

This distinction is essential for trustworthy financial reporting.

---

# 7. System Architecture

SpendWise will initially follow a modular client-server architecture.

```text
             REACT FRONTEND
                    |
                    v
             EXPRESS API
                    |
       +------------+------------+
       |            |            |
       v            v            v
  SUBSCRIPTION   ANALYTICS     RULE ENGINE
    SERVICE       ENGINE
       |            |            |
       +------------+------------+
                    |
                    v
              SUPABASE
              POSTGRESQL
                    |
                    v
             DATA STORAGE
```

### Frontend responsibilities

- Dashboard rendering.
- Navigation.
- Data visualization.
- CSV upload.
- Subscription management.
- Recommendation management.
- User interactions.

### Backend responsibilities

- Authentication and authorization.
- Data validation.
- Subscription management.
- Analytics calculations.
- Inactive license detection.
- Duplicate application analysis.
- Deterministic recommendation generation.
- Report generation.

### Database responsibilities

- Organization records.
- Users and roles.
- Subscription records.
- License records.
- Recommendations.
- Optimization history.

### Recommendation engine responsibilities

- Apply configured inactivity thresholds.
- Estimate eligible savings from recorded subscription and license costs.
- Identify upcoming renewal reviews.
- Flag subscriptions in shared categories for human review.
- Prioritize recommendations using explicit threshold rules.

---

# 8. Technology Stack

## Frontend

| Technology | Purpose |
|---|---|
| React | Component-based UI |
| JavaScript | Application logic |
| Vite | Development and build tooling |
| Tailwind CSS | Styling |
| Recharts | Financial analytics and charts |
| React Router DOM | Navigation |
| Lucide React | Icons |
| PapaParse | CSV parsing |
| React Hot Toast | Notifications |

## Backend

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | REST API |
| Supabase | PostgreSQL database and authentication |
| Prisma (optional) | Database ORM |
| Node.js recommendation engine | Deterministic recommendations |

## Deployment

| Service | Purpose |
|---|---|
| Vercel | Frontend deployment |
| Render | Backend deployment |
| Supabase | Database and authentication |

The MVP may use local sample data before the database integration is complete.

---

# 9. Application Modules

The application will contain the following major modules.

## 9.1 Dashboard

Route: `/dashboard`

Displays:

- Financial overview.
- Monthly spending charts.
- License utilization.
- Savings opportunities.
- Recent alerts.

## 9.2 Subscriptions

Route: `/subscriptions`

Displays all tracked SaaS applications.

Features:

- Subscription table.
- Search and filtering.
- Application details.
- Add and edit functionality.
- Expenditure breakdown.

## 9.3 License Management

Route: `/licenses`

Displays:

- Total licenses.
- Assigned licenses.
- Active licenses.
- Inactive licenses.
- License utilization percentage.
- Employee activity information.

## 9.4 Recommendations

Route: `/recommendations`

Displays rule-generated recommendations.

Each recommendation includes:

- Title.
- Application.
- Problem description.
- Suggested action.
- Estimated savings.
- Priority.
- Status.
- Explanation.

Recommendation statuses:

- Pending.
- Approved.
- Dismissed.
- Completed.

## 9.5 Reports

Route: `/reports`

Displays historical expenditure and savings reports.

## 9.6 Settings

Route: `/settings`

Includes:

- Organization information.
- User preferences.
- Inactivity thresholds.
- Notification preferences.
- Currency configuration.

---

# 10. Mathematical Recommendation Engine

The backend generates recommendations locally from validated workspace data. It makes no calls to an external model or recommendation provider.

## 10.1 Inactive license reviews

For each assigned, unreclaimed, non-excluded license with a valid activity date, calculate whole days since last activity. A license becomes a review candidate only when inactivity exceeds the workspace's `potentialDays` threshold. It receives High priority when inactivity also exceeds `highPriorityDays`; otherwise it is Medium priority. Missing, invalid, and future dates are not treated as inactivity.

Potential monthly savings use the license's recorded monthly cost. If that is missing, the engine prorates the subscription's monthly cost by purchased seats. Savings are capped at the subscription's recorded monthly cost. These are estimates only: the app never reclaims a license or assumes that a vendor will reduce a contract.

## 10.2 Unassigned seat reviews

For each subscription, calculate `max(totalSeats - assignedSeats, 0)`. Estimated cost is `monthlyCost * unassignedSeats / totalSeats`, capped by the remaining subscription spend after inactive-license estimates. Contract minimums may make actual savings lower or zero.

## 10.3 Renewal reviews

Active subscriptions with a valid renewal date in the next 30 days are flagged. Renewals due within 7 days are High priority; other upcoming renewals are Medium priority. The recommendation has no estimated savings unless separate eligible license or seat rules calculate them.

## 10.4 Category-overlap reviews

Two or more active subscriptions with the same non-generic category receive a review prompt. This is a category match, not proof that products overlap; it always has zero estimated savings and asks administrators to compare actual workflows and contract terms.

All rules are deterministic and tested against fixed dates and known costs. Review and approval by an authorized administrator are required before taking action.

---

# 11. Database Design

The initial database will contain the following entities.

## Organizations

| Column | Type |
|---|---|
| id | UUID |
| name | VARCHAR |
| created_at | TIMESTAMP |

## Users

| Column | Type |
|---|---|
| id | UUID |
| organization_id | UUID |
| name | VARCHAR |
| email | VARCHAR |
| role | VARCHAR |
| created_at | TIMESTAMP |

## Subscriptions

| Column | Type |
|---|---|
| id | UUID |
| organization_id | UUID |
| app_name | VARCHAR |
| vendor | VARCHAR |
| category | VARCHAR |
| monthly_cost | DECIMAL |
| total_seats | INTEGER |
| assigned_seats | INTEGER |
| renewal_date | DATE |
| owner_id | UUID |
| status | VARCHAR |
| created_at | TIMESTAMP |

## Licenses

| Column | Type |
|---|---|
| id | UUID |
| subscription_id | UUID |
| employee_email | VARCHAR |
| department | VARCHAR |
| license_type | VARCHAR |
| assigned | BOOLEAN |
| last_active | TIMESTAMP |
| monthly_cost | DECIMAL |

## Recommendations

| Column | Type |
|---|---|
| id | UUID |
| organization_id | UUID |
| subscription_id | UUID |
| type | VARCHAR |
| title | VARCHAR |
| explanation | TEXT |
| estimated_savings | DECIMAL |
| priority | VARCHAR |
| status | VARCHAR |
| created_at | TIMESTAMP |

## Optimization History

| Column | Type |
|---|---|
| id | UUID |
| recommendation_id | UUID |
| action | VARCHAR |
| approved_by | UUID |
| completed_at | TIMESTAMP |
| verified_monthly_savings | DECIMAL |
| notes | TEXT |

All organization-owned records must be isolated using organization-level authorization and database policies.

---

# 12. Data Import and CSV Format

CSV import is the primary data ingestion mechanism for the MVP.

The system should support two datasets:

### A. Subscriptions CSV

```csv
app_name,vendor,category,monthly_cost,total_seats,assigned_seats,renewal_date
Slack,Salesforce,Communication,800,100,85,2026-11-15
Figma,Figma Inc,Design,600,50,42,2026-11-20
Notion,Notion Labs,Productivity,400,80,75,2026-11-25
Zoom,Zoom,Communication,900,100,95,2026-12-01
```

### B. Licenses CSV

```csv
app_name,employee_email,department,license_type,assigned,last_active,monthly_cost
Slack,user1@example.com,Engineering,Pro,true,2026-07-01,8
Slack,user2@example.com,Marketing,Pro,true,2026-10-25,8
Figma,user3@example.com,Design,Professional,true,2026-06-10,12
Zoom,user4@example.com,Sales,Pro,true,2026-08-01,15
```

### C. Usage activity CSV (recurring sync)

Use an authorized SaaS or identity-provider activity/audit export. In **License utilization**, an organization admin can choose **Sync usage CSV** to update activity for existing licenses:

```csv
app_name,employee_email,last_active
Slack,user1@example.com,2026-10-25
Figma,user3@example.com,2026-10-28
```

Rows match an existing license by application and employee email. Only the latest activity date is retained; older exports never replace newer dates. Unknown licenses are rejected during preview. Do not collect or upload employee passwords, authentication tokens, keystrokes, screen contents, or raw event histories. Use provider exports with appropriate employee notice and access authorization. Native read-only provider integrations can be added later without giving SpendWise employee credentials.

### Automatic Windows usage agent

The Windows agent runs in the signed-in employee session, samples the foreground process name every five seconds, ignores periods after one minute of inactivity, and uploads daily app totals every minute over HTTPS. It does not collect window titles, browser page contents, passwords, keystrokes, screenshots, or document/message contents. Employees must be informed before installation; installation requires an explicit acknowledgment of the organization’s notice. The agent does not elevate privileges and stays visible while running. Browser process usage (for example `chrome.exe`) cannot distinguish individual websites.

Admins enroll only employees who already have a license record. In **Settings → Employee usage agent**, create a one-time enrollment code for the employee and device, then provide the code and API URL to the employee or IT installer. The employee runs `SpendWiseAgent.exe --install`; the agent redeems the code once, stores its device token protected for that Windows account, and starts at future user sign-ins. An admin can view recent usage, map detected executable names to subscriptions, and revoke devices. Mapped foreground use of at least one minute updates that employee’s license last-used date, which is then available to workspace analysis. Usage is stored as per-device, per-app daily totals for up to 90 days; monitoring data and identifiable reports are admin-only.

The Windows x64 agent is published as a GitHub Release asset. After pushing a tag that starts with `windows-agent-v`, the workflow at [`.github/workflows/release-windows-agent.yml`](./.github/workflows/release-windows-agent.yml) builds and publishes `SpendWiseAgent.exe`. For a local build with Go 1.24 or newer:

```bash
sh windows-agent/build-windows.sh
```

On Windows PowerShell, run `.\windows-agent\build-windows.ps1`. Local scripts place the generated executable in `frontend/public/`; the deployment workflow publishes the binary to the repository's GitHub Releases, and the admin settings page downloads the latest release. The generated executable is ignored by Git. The installer copies itself to the employee's per-user Programs folder and starts visibly at login. To stop it, close its visible console; to remove its startup entry and local credential, run `SpendWiseAgent.exe --uninstall`, then remove the installed binary after the agent exits. Admins should also revoke the device in SpendWise.

### Import requirements

- Validate file type.
- Validate required columns.
- Handle missing values.
- Normalize application names.
- Validate dates.
- Validate monetary values.
- Detect duplicate records.
- Show import errors.
- Provide a preview before saving.

The application should provide sample CSV files to help users understand the expected format.

---

# 13. API Design

The backend will expose REST endpoints.

Base URL:

```text
/api/v1
```

## Workspace

| Method | Endpoint | Description |
|---|---|---|
| GET | `/workspace` | Get the authenticated user's organization and profile |
| PATCH | `/workspace` | Update organization profile settings (admin only) |
| DELETE | `/workspace/data` | Clear organization subscriptions, licenses, and recommendations (admin only) |

## Dashboard

| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard/overview` | Retrieve dashboard metrics |
| GET | `/dashboard/spending` | Retrieve expenditure trends |
| GET | `/dashboard/utilization` | Retrieve license utilization |

## Subscriptions

| Method | Endpoint | Description |
|---|---|---|
| GET | `/subscriptions` | Get all subscriptions |
| POST | `/subscriptions` | Create subscription |
| GET | `/subscriptions/:id` | Get subscription details |
| PUT | `/subscriptions/:id` | Update subscription |
| DELETE | `/subscriptions/:id` | Delete subscription |

## Licenses

| Method | Endpoint | Description |
|---|---|---|
| GET | `/licenses` | Get all licenses |
| GET | `/licenses/inactive` | Find inactive licenses |
| GET | `/licenses/:id` | Get license details |
| PATCH | `/licenses/:id` | Update license assignment and review state |
| POST | `/monitoring/enrollments` | Admin creates a one-time employee/device enrollment code |
| POST | `/monitoring/enroll` | Redeem a one-time code and receive a device credential |
| POST | `/monitoring/activity` | Ingest authenticated, minimized app-usage totals |
| GET | `/monitoring/overview` | Admin-only device and usage summary |
| PUT | `/monitoring/app-mappings` | Admin maps an observed executable to a subscription |
| DELETE | `/monitoring/devices/:id` | Admin revokes a monitoring device |

## Recommendations

| Method | Endpoint | Description |
|---|---|---|
| GET | `/recommendations` | Get recommendations |
| POST | `/recommendations` | Save generated recommendations |
| POST | `/recommendations/analyze` | Calculate and save deterministic review recommendations |
| PATCH | `/recommendations/:id` | Update recommendation status |

## Import

| Method | Endpoint | Description |
|---|---|---|
| POST | `/import/subscriptions` | Import subscriptions |
| POST | `/import/licenses` | Import license records |
| POST | `/usage/activity/import` | Admin-only sync of latest activity dates for existing licenses |

## Reports

| Method | Endpoint | Description |
|---|---|---|
| GET | `/reports/summary` | Get financial summary |
| GET | `/reports/export` | Export report |

All endpoints should validate input, enforce organization authorization, and return consistent error responses.

---

# 14. User Interface and Experience

SpendWise should have a modern, professional enterprise SaaS interface.

### Design direction

- Clean dashboard.
- Professional typography.
- Dark and light theme support.
- Consistent spacing.
- Subtle shadows and borders.
- Responsive layouts.
- Accessible color contrast.

### Suggested sidebar navigation

```text
SPENDWISE

Overview
Dashboard

MANAGEMENT
Subscriptions
Licenses
Recommendations

ANALYTICS
Reports
Spending Insights

CONFIGURATION
Settings
```

### Dashboard visualizations

Use Recharts for:

1. Monthly SaaS expenditure — Area or Line Chart.
2. Spending by category — Pie or Donut Chart.
3. License utilization — Bar Chart.
4. Potential vs realized savings — Bar Chart.

Use consistent chart formatting, tooltips, responsive containers, and meaningful empty states.

---

# 15. Security and Privacy

SpendWise may process sensitive organizational information.

Security must be part of the architecture from the beginning.

Requirements:

- Secure authentication.
- Role-based access control.
- Organization-level data isolation.
- Server-side API key storage.
- Input validation and sanitization.
- Protected API endpoints.
- Secure environment variable handling.
- Audit logs for administrative actions.
- Minimal collection of employee information.
- Secure file upload handling.

Never revoke employee access without an authorized administrative approval workflow.

---

# 16. Project Structure

Recommended monorepo structure:

```text
spendwise-ai/
│
├── client/
│   ├── public/
│   │   └── sample-data/
│   │
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── dashboard/
│   │   │   ├── charts/
│   │   │   ├── subscriptions/
│   │   │   ├── licenses/
│   │   │   └── recommendations/
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Subscriptions.jsx
│   │   │   ├── Licenses.jsx
│   │   │   ├── Recommendations.jsx
│   │   │   ├── Reports.jsx
│   │   │   └── Settings.jsx
│   │   │
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── data/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   └── package.json
│
├── server/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   │   ├── analytics.js
│   │   ├── detection.js
│   │   ├── recommendations.js
│   │   └── ai.js
│   │
│   ├── config/
│   ├── prisma/
│   ├── utils/
│   ├── server.js
│   └── package.json
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └── database.md
│
├── .gitignore
└── README.md
```

---

# 17. Installation and Setup

The frontend supports an illustrative browser-local demo when Supabase frontend settings are omitted, and authenticated persistent workspaces when they are configured.

## Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env.local` using the Supabase project URL and publishable/anon key. Set `VITE_API_BASE_URL` to the backend API URL (locally, `http://localhost:3001/api/v1`). Restart Vite after changing environment variables. Open the URL Vite prints (normally `http://localhost:5173`) and create an account or sign in. New accounts can confirm their email if required by Supabase, then create an organization; its creator becomes its admin.

If both Supabase frontend variables are blank, the app runs in its browser-local demo mode. Do not put a Supabase service-role key in any `VITE_` variable.

## Backend API

In another terminal:

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The API listens on port `3001` by default. `GET /api/v1/health` works without credentials; persistent organization endpoints return `503` until Supabase is configured.

## Supabase

1. Create a Supabase project and enable Supabase Auth.
2. Enable email sign-ups in Supabase Auth. Set the local Site URL to `http://localhost:5173` and add it to the allowed redirect URLs; configure the production domain there before deployment.
3. Apply all SQL files in `backend/supabase/migrations/` in filename order, including [`20261031000000_initial_schema.sql`](./backend/supabase/migrations/20261031000000_initial_schema.sql), [`20261031000001_workspace_profile_updates.sql`](./backend/supabase/migrations/20261031000001_workspace_profile_updates.sql), [`20261031000002_self_service_onboarding.sql`](./backend/supabase/migrations/20261031000002_self_service_onboarding.sql), [`20261031000003_usage_activity_import.sql`](./backend/supabase/migrations/20261031000003_usage_activity_import.sql), [`20261031000004_monitoring_agent.sql`](./backend/supabase/migrations/20261031000004_monitoring_agent.sql), and [`20261101000005_secure_monitoring_retention.sql`](./backend/supabase/migrations/20261101000005_secure_monitoring_retention.sql), in the Supabase SQL editor or with the Supabase CLI. If earlier migrations were already applied, apply only the newer migration.
4. New users create their own isolated organization during onboarding. Existing users still need a matching organization membership in `public.users`. The migrations enable organization-scoped row-level security.
5. Configure backend environment variables below. Do not add a service-role key to the frontend.

The frontend authenticates with Supabase Auth and sends the user's access token to the API. A restricted database function provisions an organization only for the authenticated user who is not already a member; it assigns that user the admin role. The API uses the anon key and row-level security for organization-scoped persistence. Inactivity thresholds and notification preferences remain browser-local, scoped to the signed-in user.

## Production deployment on Vercel

Deploy the frontend and API as **two Vercel projects** from the same GitHub repository:

1. Push the code to GitHub. Create the frontend Vercel project with **Root Directory** set to the repository root. The root [`vercel.json`](./vercel.json) installs frontend dependencies, builds `frontend/`, adds security headers, and routes client-side pages to `index.html`.
2. Create the backend Vercel project from the same repository with **Root Directory** set to `backend`; Vercel detects the Express app exported from `src/server.js`. Use Node.js 24.x. Note each project's HTTPS domain.
3. Add these backend environment variables for Production: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGIN`, and `CRON_SECRET`. Set `CORS_ORIGIN` to the exact frontend origin, without a trailing slash. Never put the service-role key in the frontend.
4. Add the frontend Production environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_BASE_URL=https://<backend-domain>/api/v1`.
5. In Supabase Auth URL configuration, set the production frontend domain as the Site URL and add production frontend callback URLs to the redirect allow-list.
6. Deploy both projects, then redeploy the frontend after its API URL and the backend's CORS origin are configured.
7. Publish the Windows agent once by pushing a tag such as `windows-agent-v1.0.0`. The GitHub Actions workflow builds and attaches `SpendWiseAgent.exe` to a release; the Settings download link serves the latest release.
8. Verify the backend health endpoint, sign-up/sign-in and email confirmation, organization isolation, imports, deterministic recommendation generation, enrollment and upload from a Windows device, agent revocation, and the protected daily cleanup Cron Job before inviting employees.

The backend's [`vercel.json`](./backend/vercel.json) schedules retention cleanup once daily. Set `CRON_SECRET` in the backend Vercel project; Vercel sends it as a bearer token. The cleanup RPC requires the server-only Supabase service-role key and the latest database migration. Do not manually expose the cleanup RPC to anonymous or authenticated client roles.

For pull-request previews, use a separate Supabase staging project or keep Preview deployments disconnected from production data. Configure matching CORS origins, Supabase redirect URLs, and backend API URLs for each environment.

## CSV templates

Subscription and license sample files are in [`frontend/public/subscriptions-template.csv`](./frontend/public/subscriptions-template.csv) and [`frontend/public/licenses-template.csv`](./frontend/public/licenses-template.csv). Import in **Subscriptions** or **License utilization**.

---

# 18. Environment Variables

### Backend `.env`

```env
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://<frontend-domain>
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

The API uses `SUPABASE_ANON_KEY` with the signed-in user's access token and row-level security for normal requests. `SUPABASE_SERVICE_ROLE_KEY` is used only by the protected scheduled retention-cleanup function; never expose it to Vite or a browser. `CRON_SECRET` protects that scheduled endpoint. Set `CORS_ORIGIN` to the exact frontend origin (or comma-separated origins) in each environment. Recommendations are calculated from workspace data without an external provider.

## MVP checks

```bash
cd frontend && npm run lint && npm test && npm run build
cd ../backend && npm run lint && npm test
```

The interactive demo, CSV imports, subscription/license workflows, analytics, recommendation approval, verified-savings tracking, and CSV reports are available in demo and authenticated workspace modes. In authenticated mode, business records persist in Supabase; thresholds and notification preferences remain browser-local.

Never commit environment files or expose privileged credentials.

---

# 19. Development Roadmap

## Phase 1: 24-Hour MVP

Goal: Demonstrate the complete SaaS cost optimization workflow.

| Feature | Priority |
|---|---|
| Dashboard | P0 |
| Subscription management | P0 |
| CSV import | P0 |
| Inactive license detection | P0 |
| Potential savings calculator | P0 |
| Mathematical recommendations | P1 |
| Duplicate application detection | P1 |
| Renewal alerts | P1 |
| Reports | P1 |
| Authentication | P2 |
| Live SaaS integrations | P2 |

The MVP should prioritize a reliable end-to-end demo over a large number of incomplete features.

## Phase 2: Functional SaaS Product

- User authentication.
- Organization management.
- Persistent database.
- Multiple organization support.
- Advanced filtering.
- Department-level analytics.
- Email notifications.
- Historical savings tracking.
- Exportable reports.

## Phase 3: SaaS Integrations

Connect directly with:

- Google Workspace.
- Microsoft 365.
- Slack.
- GitHub.
- Zoom.
- Notion.
- Figma.

Use official APIs and authorized OAuth permissions wherever available.

## Phase 4: Advanced Intelligence

- Semantic duplicate detection.
- Predictive subscription analysis.
- License demand forecasting.
- Renewal risk prediction.
- Department-level spending recommendations.
- Vendor price benchmarking.
- Automated procurement workflows.

## Phase 5: Enterprise Platform

- Advanced RBAC.
- Audit trails.
- SSO.
- SCIM provisioning.
- Approval workflows.
- Enterprise reporting.
- Contract management.
- Multi-currency support.

---

# 20. Future Enhancements

Potential future capabilities include:

### Shadow IT Discovery

Identify applications purchased independently by employees or departments.

### Financial Anomaly Detection

Identify unexpected recurring charges, unusual price increases, and duplicate payments.

### Contract Intelligence

Extract contract terms, renewal clauses, cancellation windows, and minimum-seat commitments.

### Predictive Spend Forecasting

Estimate future software expenditure based on current subscriptions, utilization, and renewal schedules.

### Automated License Reclamation

Integrate with provider APIs to reclaim approved licenses.

### Procurement Intelligence

Help organizations compare software alternatives and consolidate vendors.

---

# 21. Success Metrics

SpendWise should measure business outcomes, not just application activity.

| KPI | Measurement |
|---|---|
| Total Spend Analyzed | Value of processed SaaS expenditure |
| Inactive Licenses Detected | Count of potentially unused licenses |
| Potential Savings | Estimated monthly cost reduction |
| Verified Savings | Actual reduction in expenditure |
| Recommendations Approved | Approved recommendations / total recommendations |
| Renewal Coverage | Percentage of subscriptions with tracked renewal dates |
| Detection Accuracy | Correctly identified issues / reviewed detections |

The platform must distinguish potential savings from verified savings.

---

# 22. Target Users

### CFOs and Finance Teams

Need visibility into recurring software expenditure and cost reduction opportunities.

### IT Administrators

Need to manage licenses, access, and software utilization.

### Procurement Teams

Need better control over software purchasing and vendor relationships.

### CTOs and Engineering Managers

Need to understand the organization's technology ecosystem and eliminate unnecessary software duplication.

### Startup Founders

Need to reduce operational expenses and maximize limited budgets.

---

# 23. Contributing

Contributions are welcome.

Suggested contribution areas:

- Frontend development.
- Backend development.
- Recommendation rule improvements.
- SaaS provider integrations.
- Security improvements.
- Documentation.
- Testing.

### Contribution workflow

1. Fork the repository.
2. Create a feature branch.
3. Implement your changes.
4. Test the functionality.
5. Submit a pull request.

Example:

```bash
git checkout -b feature/license-detection

git add .

git commit -m "feat: implement inactive license detection"

git push origin feature/license-detection
```

---

# 24. License

This project is intended to be released under the MIT License.

Add a `LICENSE` file containing the appropriate MIT License text before publishing under that license.

---

# Final Vision

SpendWise is not simply another subscription tracking dashboard.

It is designed to become an intelligent SaaS financial operations platform that helps organizations understand where their software budgets go, identify inefficiencies, make informed purchasing decisions, and continuously optimize recurring expenditure.

**Discover waste. Understand spending. Optimize intelligently.**

**SpendWise — Every subscription should earn its place.**