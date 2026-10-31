# SpendWise AI

### AI-Powered SaaS Spend Intelligence & License Optimization Platform

> Stop paying for software nobody uses.

SpendWise AI is an intelligent SaaS spend management platform that helps organizations discover software subscriptions, identify unused licenses, detect redundant applications, monitor upcoming renewals, and optimize recurring software expenditure.

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
10. [AI Intelligence Engine](#ai-intelligence-engine)
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

SpendWise AI addresses this problem.

It analyzes software expenditure and license utilization data to identify unnecessary spending and provide intelligent cost optimization recommendations.

### Key capabilities

- Centralized SaaS subscription management.
- Automated identification of inactive licenses.
- SaaS expenditure analytics.
- Duplicate and overlapping application detection.
- Upcoming subscription renewal monitoring.
- AI-generated cost optimization recommendations.
- Potential and realized savings tracking.
- Downloadable financial reports.

### Core value proposition

**SpendWise AI transforms fragmented SaaS expenditure into actionable financial intelligence.**

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

SpendWise AI aims to make optimization continuous rather than reactive.

---

# 3. Our Solution

SpendWise AI provides a centralized intelligence layer that connects subscription expenditure, license utilization, and application information.

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
- Explainable AI recommendations.
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

## 5.5 AI Recommendations

An intelligent recommendation engine analyzes organizational spending and generates actionable suggestions.

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
     AI INTELLIGENCE
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

SpendWise AI will initially follow a modular client-server architecture.

```text
             REACT FRONTEND
                    |
                    v
             EXPRESS API
                    |
       +------------+------------+
       |            |            |
       v            v            v
  SUBSCRIPTION   ANALYTICS     AI SERVICE
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
- AI recommendation generation.
- Report generation.

### Database responsibilities

- Organization records.
- Users and roles.
- Subscription records.
- License records.
- Recommendations.
- Optimization history.

### AI service responsibilities

- Analyze detected inefficiencies.
- Generate contextual explanations.
- Suggest optimization strategies.
- Prioritize recommendations.

The AI service should not be responsible for authoritative financial calculations. Those should be performed deterministically by the backend.

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
| Gemini API / OpenAI API | AI recommendations |

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

Displays AI-generated recommendations.

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

# 10. AI Intelligence Engine

AI is one of the platform's differentiating components.

However, financial calculations and detection rules should remain deterministic.

## 10.1 Inactive License Detection

Calculate the number of inactive assigned licenses:

```javascript
function detectInactiveLicenses(licenses, threshold = 90) {
  const now = new Date();

  return licenses.filter((license) => {
    if (!license.assigned) return false;
    if (!license.lastActive) return false;

    const lastActive = new Date(license.lastActive);

    if (Number.isNaN(lastActive.getTime())) return false;

    const inactiveDays = Math.floor(
      (now - lastActive) / (1000 * 60 * 60 * 24)
    );

    return inactiveDays >= threshold;
  });
}
```

## 10.2 Potential Savings Calculation

For eligible unused licenses:

```javascript
function calculatePotentialSavings(licenses) {
  return licenses.reduce((total, license) => {
    return total + (
      license.reclaimable
        ? Number(license.monthlyCost || 0)
        : 0
    );
  }, 0);
}
```

Only count licenses marked as eligible after review.

The actual savings may depend on contract terms, billing commitments, and whether the vendor permits seat reductions.

## 10.3 Duplicate Application Detection

Use a category-based first-pass algorithm:

```javascript
function detectPotentialDuplicates(applications) {
  const categories = {};

  applications.forEach((app) => {
    if (!categories[app.category]) {
      categories[app.category] = [];
    }

    categories[app.category].push(app);
  });

  return Object.entries(categories)
    .filter(([, apps]) => apps.length > 1)
    .map(([category, apps]) => ({
      category,
      applications: apps
    }));
}
```

This detects category overlap, not confirmed duplication.

A more advanced version can use semantic similarity between application descriptions.

## 10.4 AI Recommendation Generation

The AI model should receive structured analysis results rather than raw financial records whenever possible.

Example input:

```json
{
  "application": "Slack",
  "totalSeats": 100,
  "inactiveSeats": 20,
  "monthlyCostPerSeat": 8,
  "inactiveThreshold": 90,
  "potentialMonthlySavings": 160
}
```

Expected response:

```json
{
  "priority": "high",
  "title": "Review inactive Slack licenses",
  "finding": "20 assigned licenses have been inactive for over 90 days.",
  "recommendation": "Review the accounts with department owners and reclaim eligible licenses.",
  "estimatedMonthlySavings": 160,
  "estimatedAnnualSavings": 1920
}
```

AI output must be validated before being saved or displayed.

The model must never invent financial figures or claim that an optimization has been completed when it has only been recommended.

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

## Recommendations

| Method | Endpoint | Description |
|---|---|---|
| GET | `/recommendations` | Get recommendations |
| POST | `/recommendations/generate` | Generate recommendations |
| PATCH | `/recommendations/:id` | Update recommendation status |

## Import

| Method | Endpoint | Description |
|---|---|---|
| POST | `/import/subscriptions` | Import subscriptions |
| POST | `/import/licenses` | Import license records |

## Reports

| Method | Endpoint | Description |
|---|---|---|
| GET | `/reports/summary` | Get financial summary |
| GET | `/reports/export` | Export report |

All endpoints should validate input, enforce organization authorization, and return consistent error responses.

---

# 14. User Interface and Experience

SpendWise AI should have a modern, professional enterprise SaaS interface.

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
SPENDWISE AI

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

SpendWise AI may process sensitive organizational information.

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

Never expose AI provider API keys in frontend code.

Never send unnecessary employee information to AI providers.

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

## Prerequisites

Install the following:

- Node.js 20 or later.
- npm.
- Git.
- Supabase account (for database integration).
- AI API key (for AI-powered recommendations).

## Step 1: Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd spendwise-ai
```

## Step 2: Initialize the frontend

```bash
cd client
npm install
npm run dev
```

## Step 3: Initialize the backend

Open another terminal:

```bash
cd server
npm install
npm run dev
```

## Step 4: Configure the database

Create a Supabase project and configure the PostgreSQL connection.

Run the database migrations before using persistent storage.

## Step 5: Configure environment variables

Create environment files using the examples below.

## Step 6: Open the application

```text
http://localhost:5173
```

Note: These commands describe the intended project setup. The backend, database migrations, and individual scripts must be implemented before the complete application can run.

---

# 18. Environment Variables

### Frontend `.env`

```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Only public Supabase client configuration belongs in frontend environment variables. Enforce database access through appropriate security policies.

### Backend `.env`

```env
PORT=5000
NODE_ENV=development

DATABASE_URL=

GEMINI_API_KEY=
OPENAI_API_KEY=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

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
| AI recommendations | P1 |
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

SpendWise AI should measure business outcomes, not just application activity.

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
- AI recommendation algorithms.
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

SpendWise AI is not simply another subscription tracking dashboard.

It is designed to become an intelligent SaaS financial operations platform that helps organizations understand where their software budgets go, identify inefficiencies, make informed purchasing decisions, and continuously optimize recurring expenditure.

**Discover waste. Understand spending. Optimize intelligently.**

**SpendWise AI — Every subscription should earn its place.**