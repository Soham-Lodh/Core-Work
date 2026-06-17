# Core Work — Project Management Platform

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.x-brightgreen)
![React](https://img.shields.io/badge/react-19-61DAFB?logo=react)
![Prisma](https://img.shields.io/badge/prisma-6.x-2D3748?logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/tailwindcss-4.x-38BDF8?logo=tailwindcss)

A full-stack, multi-workspace project management application built with React, Node.js/Express, Prisma ORM, and Clerk authentication — with real-time user sync powered by Inngest.

</div>

> **Live Demo:** [core-work.vercel.app](https://core-work.vercel.app/)
---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Backend](#backend)
  - [Server Setup](#server-setup)
  - [Authentication Middleware](#authentication-middleware)
  - [API Routes & Controllers](#api-routes--controllers)
  - [Inngest Event Functions](#inngest-event-functions)
  - [Email Configuration](#email-configuration)
- [Frontend](#frontend)
  - [Application Entry Point](#application-entry-point)
  - [State Management](#state-management)
  - [Pages](#pages)
  - [Components](#components)
  - [Theme System](#theme-system)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
  - [Running the App](#running-the-app)
- [Deployment](#deployment)
- [License](#license)

---

## Overview

**Core Work** is a collaborative project management platform that lets teams organize their work across multiple workspaces, projects, and tasks. It mirrors the mental model of tools like Linear or Asana: you belong to one or more **Workspaces** (organizations), each workspace has **Projects**, and each project contains **Tasks** assigned to team members.

Authentication and organization management are fully delegated to [Clerk](https://clerk.dev/), with Clerk webhook events automatically synced to the application's own PostgreSQL database via [Inngest](https://www.inngest.com/) background functions. This means user creation, deletion, workspace creation, and membership changes all propagate automatically without any manual intervention.

---

## Features

- **Multi-workspace support** — switch between workspaces via a dropdown; each workspace is a Clerk Organization.
- **Role-based access control** — workspace roles (`ADMIN` / `MEMBER`) and project-level team leads gate actions at the API level.
- **Project lifecycle management** — create, update, and track projects with statuses (`ACTIVE`, `PLANNING`, `COMPLETED`, `ON_HOLD`, `CANCELLED`), priority levels, date ranges, and a manual progress slider.
- **Task management** — create tasks with type (`TASK`, `BUG`, `FEATURE`, `IMPROVEMENT`, `OTHER`), priority, status, assignee, and due date. Update status inline, bulk-delete selected tasks, and filter by status/type/priority/assignee.
- **Task discussion / comments** — threaded comments on each task with auto-polling every 10 seconds for near-real-time updates.
- **Project analytics** — completion rate, active/overdue task counters, team size, bar chart by status, pie chart by type, and priority breakdown with progress bars (powered by Recharts).
- **Project calendar** — monthly calendar view showing task due dates, upcoming tasks, and overdue task alerts.
- **Project settings** — edit project metadata and manage team members.
- **Team management** — invite members to workspaces via Clerk, view all members in a searchable table/card list with roles.
- **Dashboard** — stats grid, project overview, recent activity feed, and personal task summary.
- **Dark / Light mode** — persisted in `localStorage`, toggled from the navbar.
- **Responsive design** — table views on desktop collapse to card views on mobile throughout.
- **Optimistic UI updates** — Redux state is updated immediately on task/project mutations; no full re-fetch needed.

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express 5** | HTTP server and REST API |
| **Prisma 6 + `@prisma/adapter-neon`** | ORM and database access layer |
| **Neon (PostgreSQL)** | Serverless PostgreSQL database |
| **Clerk (`@clerk/express`)** | Authentication, user & organization management |
| **Inngest** | Durable background functions for Clerk webhook event sync |
| **Nodemailer** | Transactional email (SMTP) |
| **`ws`** | WebSocket constructor required by the Neon serverless driver |
| **dotenv** | Environment variable management |
| **nodemon** | Development hot-reloading |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19 + Vite 8** | UI framework and build toolchain |
| **React Router DOM 7** | Client-side routing |
| **Redux Toolkit + React-Redux** | Global state management |
| **Clerk (`@clerk/react`)** | Frontend auth, `<SignIn>`, `<UserButton>`, org hooks |
| **Tailwind CSS 4** | Utility-first styling |
| **Recharts** | Analytics charts (bar, pie) |
| **Axios** | HTTP client for API requests |
| **date-fns** | Date formatting and manipulation |
| **lucide-react** | Icon library |
| **react-hot-toast** | Toast notifications |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  React + Vite  ──  Redux  ──  Clerk React  ──  Axios        │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS REST
┌───────────────────────────▼─────────────────────────────────┐
│                   Express Backend                           │
│  clerkMiddleware ──► protect ──► Controllers                │
│                                      │                      │
│  Inngest /api/ingest ◄── Clerk Webhooks                     │
└──────────────┬──────────────────┬────────────────────────────┘
               │ Prisma ORM       │ Nodemailer
    ┌──────────▼──────────┐  ┌────▼──────────────┐
    │  Neon PostgreSQL    │  │   SMTP Server     │
    └─────────────────────┘  └───────────────────┘
```

**Data flow for user / workspace lifecycle:**

1. A user signs up or creates an organization in Clerk.
2. Clerk fires a webhook (`user.created`, `organization.created`, etc.) to `/api/ingest`.
3. Inngest receives the event and runs the corresponding function to create/update/delete the record in the Neon PostgreSQL database.
4. All subsequent API calls from the frontend carry a Clerk JWT; the `protect` middleware validates it via `req.auth()`.

---

## Project Structure

```
soham-lodh-core-work/
├── LICENSE
├── README.md
│
├── backend/
│   ├── server.js                  # Express app entry point
│   ├── package.json
│   ├── vercel.json                # Backend Vercel deployment config
│   ├── configs/
│   │   ├── prisma.js              # Prisma client (Neon adapter)
│   │   └── nodemailer.js          # Email transporter
│   ├── controllers/
│   │   ├── workspaceController.js
│   │   ├── projectController.js
│   │   ├── taskController.js
│   │   └── commentController.js
│   ├── inngest/
│   │   └── index.js               # All Inngest functions + exports
│   ├── middleware/
│   │   └── authMiddleware.js      # JWT protect middleware
│   ├── prisma/
│   │   └── schema.prisma          # Full data model
│   └── routes/
│       ├── workspaceRoutes.js
│       ├── projectRoutes.js
│       ├── taskRoutes.js
│       └── commentRoutes.js
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── vercel.json                # SPA rewrite rule
    ├── configs/
    │   └── api.js                 # Axios instance with baseURL
    └── src/
        ├── main.jsx               # React root + providers
        ├── App.jsx                # Route definitions
        ├── index.css              # Global styles + Tailwind
        ├── app/
        │   └── store.js           # Redux store
        ├── assets/
        │   └── assets.js          # Static assets + dummy data
        ├── features/
        │   ├── themeSlice.js      # Dark/light mode reducer
        │   └── workspaceSlice.js  # Workspaces + async thunk
        ├── pages/
        │   ├── Layout.jsx         # Root layout (auth gate)
        │   ├── Dashboard.jsx
        │   ├── Projects.jsx
        │   ├── ProjectDetails.jsx
        │   ├── TaskDetails.jsx
        │   └── Team.jsx
        └── components/
            ├── Navbar.jsx
            ├── Sidebar.jsx
            ├── WorkspaceDropdown.jsx
            ├── ProjectsSidebar.jsx
            ├── MyTasksSidebar.jsx
            ├── StatsGrid.jsx
            ├── ProjectOverview.jsx
            ├── RecentActivity.jsx
            ├── TasksSummary.jsx
            ├── ProjectCard.jsx
            ├── ProjectTasks.jsx
            ├── ProjectAnalytics.jsx
            ├── ProjectCalendar.jsx
            ├── ProjectSettings.jsx
            ├── CreateProjectDialog.jsx
            ├── CreateTaskDialog.jsx
            ├── AddProjectMember.jsx
            └── InviteMemberDialog.jsx
```

---

## Database Schema

The Prisma schema lives at `backend/prisma/schema.prisma` and targets PostgreSQL via the Neon serverless adapter.

### Enums

| Enum | Values |
|---|---|
| `WorkspaceRole` | `ADMIN`, `MEMBER` |
| `TaskStatus` | `TODO`, `IN_PROGRESS`, `DONE` |
| `TaskType` | `TASK`, `BUG`, `FEATURE`, `IMPROVEMENT`, `OTHER` |
| `ProjectStatus` | `ACTIVE`, `PLANNING`, `COMPLETED`, `ON_HOLD`, `CANCELLED` |
| `Priority` | `LOW`, `MEDIUM`, `HIGH` |

### Models

**`User`**
The primary user record, synced from Clerk via Inngest. Stores `id` (Clerk user ID), `name`, `email`, `image`. Related to workspaces (via `WorkspaceMember`), tasks (as assignee), comments, and owned workspaces/projects.

**`Workspace`**
Mirrors a Clerk Organization. Stores `id` (Clerk org ID), `name`, `slug`, optional `description`, a `settings` JSON blob, `ownerId`, and `image_url`. Has many `members` (WorkspaceMember) and `projects`.

**`WorkspaceMember`**
Join table between `User` and `Workspace`. Carries the member's `role` (`ADMIN` or `MEMBER`) and an optional `message`. A unique constraint prevents duplicate membership (`userId + workspaceId`).

**`Project`**
Belongs to a `Workspace`. Key fields: `name`, `description`, `priority`, `status`, `start_date`, `end_date`, `team_lead` (FK to `User`), and `progress` (0–100 integer). Has many `ProjectMember` and `Task`.

**`ProjectMember`**
Join table between `User` and `Project`. Unique constraint on `(userId, projectId)`.

**`Task`**
Belongs to a `Project` and has an `assignee` (FK to `User`). Key fields: `title`, `description`, `status`, `type`, `priority`, `due_date`. Has many `Comment`.

**`Comment`**
Belongs to both a `Task` and a `User`. Stores free-text `content` and `createdAt`.

### Entity-Relationship Summary

```
User ──< WorkspaceMember >── Workspace ──< Project ──< Task ──< Comment
User ──< ProjectMember  >── Project
User ──< Comment
User ──< Task (assignee)
User ──< Workspace (owner)
User ──< Project (team_lead)
```

---

## Backend

### Server Setup

**`backend/server.js`**

The Express application initialises in this order:

1. Parse JSON bodies (`express.json()`)
2. Enable CORS (`cors()`)
3. Apply Clerk's `clerkMiddleware()` — attaches `req.auth` to every request
4. Mount the Inngest serving handler at `POST /api/ingest`
5. Mount protected API routers under `/api/workspaces`, `/api/projects`, `/api/tasks`, `/api/comments` — each wrapped in the custom `protect` middleware

```js
app.use('/api/ingest', serve({ client: inngest, functions }));
app.use('/api/workspaces', protect, workspaceRouter);
app.use('/api/projects',  protect, projectRouter);
app.use('/api/tasks',     protect, taskRouter);
app.use('/api/comments',  protect, commentRouter);
```

Listens on `process.env.PORT` or `5000`.

---

### Authentication Middleware

**`backend/middleware/authMiddleware.js`**

```js
export const protect = async (req, res, next) => {
  const { userId } = await req.auth();
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  return next();
};
```

`req.auth()` is injected by Clerk's middleware and validates the Bearer JWT. All protected routes require a valid Clerk session token sent as `Authorization: Bearer <token>`.

---

### API Routes & Controllers

#### Workspaces — `GET /api/workspaces`, `POST /api/workspaces/add-member`

**`GET /api/workspaces`** — `getUserWorkspaces`
Returns all workspaces where the authenticated user is a member, deeply nested with members (including user details), projects, tasks (with assignees and comments), and the workspace owner.

**`POST /api/workspaces/add-member`** — `addMember`
Allows a workspace `ADMIN` to add an existing user (by email) to the workspace with a specified role (`ADMIN` or `MEMBER`). Validates that the role is valid, the workspace exists, the requester is an admin, and the target user is not already a member.

---

#### Projects — `POST /api/projects`, `PUT /api/projects`, `POST /api/projects/:projectId/addMember`

**`POST /api/projects`** — `createProject`
Creates a new project within a workspace. Only workspace `ADMIN`s may create projects. Accepts:
- `workspaceId`, `name`, `description`, `status`, `priority`, `start_date`, `end_date`, `team_members` (array of emails), `team_lead` (email), `progress`

The team lead is resolved from their email to a user ID. Team members are cross-referenced against the workspace's existing members and added as `ProjectMember` records. Returns the full project with members, tasks, and owner populated.

**`PUT /api/projects`** — `updateProject`
Updates project metadata. Permitted for workspace `ADMIN`s or the project's own `team_lead`. Returns 403 if neither condition is met.

**`POST /api/projects/:projectId/addMember`** — `addMember`
Adds an existing user to a specific project by email. Only the project's `team_lead` may call this endpoint.

---

#### Tasks — `POST /api/tasks`, `PUT /api/tasks/:id`, `DELETE /api/tasks/delete`

**`POST /api/tasks`** — `createTask`
Creates a task within a project. Only the project's `team_lead` may create tasks. The assignee must already be a project member. Accepts `title`, `description`, `type`, `status`, `priority`, `assigneeId`, `due_date`.

**`PUT /api/tasks/:id`** — `updateTask`
Updates any fields on a task. Only the project's `team_lead` may update tasks. Accepts the full body via `data: req.body` (partial updates supported).

**`DELETE /api/tasks/delete`** — `deleteTask`
Bulk-deletes tasks by an array of `taskIds` in the request body. Only the project's `team_lead` is authorised.

---

#### Comments — `POST /api/comments`, `GET /api/comments/:taskId`

**`POST /api/comments`** — `addComment`
Adds a comment to a task. The commenter must be a member of the project that owns the task. Accepts `taskId` and `content`.

**`GET /api/comments/:taskId`** — `getTaskComments`
Returns all comments for a given task, each including the author's user record.

---

### Inngest Event Functions

**`backend/inngest/index.js`**

Inngest provides durable, serverless background job execution. Seven functions are registered, each triggered by a Clerk webhook event:

| Function ID | Clerk Event | Action |
|---|---|---|
| `sync-user-created` | `clerk/user.created` | `prisma.user.create` |
| `sync-user-updated` | `clerk/user.updated` | `prisma.user.update` |
| `sync-user-deleted` | `clerk/user.deleted` | `prisma.user.delete` |
| `sync-workspace-created` | `clerk/organization.created` | `prisma.workspace.create` + `prisma.workspaceMember.create` (ADMIN) |
| `sync-workspace-updated` | `clerk/organization.updated` | `prisma.workspace.update` |
| `sync-workspace-deleted` | `clerk/organization.deleted` | `prisma.workspace.delete` (cascades to all members/projects/tasks/comments) |
| `sync-workspace-member-created` | `clerk/organizationInvitation.accepted` | `prisma.workspaceMember.create` |

**Setup in Clerk:** Configure your Clerk webhook to point to `<your-backend-url>/api/ingest` and enable all `user.*`, `organization.*`, and `organizationInvitation.*` events.

---

### Email Configuration

**`backend/configs/nodemailer.js`**

A Nodemailer transporter is configured from SMTP environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SENDER_EMAIL`). The exported `sendEmail({ to, subject, body })` function is available for use anywhere in the backend (e.g., task assignment notifications).

---

## Frontend

### Application Entry Point

**`frontend/src/main.jsx`**

The React root wraps the entire app in four providers:

```
BrowserRouter
  └── ClerkProvider (publishableKey from VITE_CLERK_PUBLISHABLE_KEY)
        └── Redux Provider (store)
              └── App
```

**`frontend/src/App.jsx`**

Defines the route tree:

```
/ (Layout)
├── index       → Dashboard
├── team        → Team
├── projects    → Projects
├── projectsDetail?id=&tab=  → ProjectDetails
└── taskDetails?projectId=&taskId=  → TaskDetails
```

A `<Toaster />` from `react-hot-toast` is mounted at the root level for global toast notifications.

---

### State Management

Redux Toolkit manages two slices of global state:

#### `workspaceSlice` (`frontend/src/features/workspaceSlice.js`)

Handles all workspace, project, and task state.

**Async Thunk:**
- `fetchWorkspaces(getToken)` — fetches all workspaces for the authenticated user from `GET /api/workspaces`. On success, restores the last active workspace from `localStorage` (`currentWorkspaceId`).

**Synchronous Actions:**
| Action | Description |
|---|---|
| `setWorkspaces` | Replace entire workspace list |
| `setCurrentWorkspace(id)` | Switch active workspace; persists ID to `localStorage` |
| `addWorkspace` | Append a new workspace and set it as current |
| `updateWorkspace` | Replace a workspace in the list; updates current if matching |
| `deleteWorkspace` | Remove a workspace from the list |
| `addProject` | Push a project into the current workspace and mirror in the flat list |
| `addTask` | Push a task into its parent project in both `currentWorkspace` and `workspaces` |
| `updateTask` | Replace a task in place across both state trees |
| `deleteTask(taskIds[])` | Remove tasks by ID array from both state trees |

**State shape:**
```js
{
  workspaces: Workspace[],
  currentWorkspace: Workspace | null,
  loading: boolean
}
```

#### `themeSlice` (`frontend/src/features/themeSlice.js`)

Manages the light/dark mode toggle.

| Action | Description |
|---|---|
| `toggleTheme` | Flips theme, persists to `localStorage`, toggles `.dark` on `<html>` |
| `setTheme(theme)` | Set theme explicitly |
| `loadTheme` | Read theme from `localStorage` on app boot and apply `.dark` class |

---

### Pages

#### `Layout.jsx`
The root layout component. Responsibilities:

- Dispatches `loadTheme()` on mount.
- Fetches workspaces via `fetchWorkspaces` once the Clerk user is loaded.
- Renders `<SignIn />` (Clerk-managed) if the user is not authenticated.
- Shows a full-screen spinner while workspaces are loading.
- Renders Clerk's `<CreateOrganization />` if the user has no workspaces (onboarding flow).
- Composes the main shell: `<Sidebar>` | `<Navbar>` + `<Outlet>`.

#### `Dashboard.jsx`
The main home screen. Displays:
- A welcome greeting using the Clerk user's `fullName`.
- A "New Project" button opening `CreateProjectDialog`.
- `<StatsGrid />` — four KPI cards.
- Two-column layout: `<ProjectOverview />` + `<RecentActivity />` on the left, `<TasksSummary />` on the right.

#### `Projects.jsx`
A pageless grid of all projects in the current workspace. Features:
- Live search filtering on name and description.
- Dropdown filters for status and priority.
- Renders `<ProjectCard />` for each matched project.
- Empty state with a "Create Project" CTA.

#### `ProjectDetails.jsx`
Accessed via `/projectsDetail?id=<projectId>&tab=<tab>`. Renders a project detail view with four tabbed sub-views:

| Tab | Component | Description |
|---|---|---|
| `tasks` | `<ProjectTasks />` | Filterable, sortable task table/cards with inline status editing |
| `calendar` | `<ProjectCalendar />` | Monthly calendar with due-date markers |
| `analytics` | `<ProjectAnalytics />` | Charts and KPI metrics |
| `settings` | `<ProjectSettings />` | Edit project details, manage members |

Also shows info cards for total tasks, completed, in-progress, and team size. The active tab and project ID are reflected in the URL query string.

#### `TaskDetails.jsx`
Accessed via `/taskDetails?projectId=<id>&taskId=<id>`. Two-panel layout:
- **Left panel:** Task discussion chatbox — lists all comments with author avatars and timestamps. Comments are aligned left or right based on whether the comment author is the current user. Auto-polls for new comments every 10 seconds via `setInterval`.
- **Right panel:** Task metadata (title, status badge, type, priority, description, assignee, due date) and parent project summary (name, start date, status, priority, progress).

#### `Team.jsx`
Displays all workspace members. Features:
- Stats cards: total members, active projects, total tasks.
- Searchable member list (by name or email).
- Desktop: table with columns for name, email, role (with colour-coded role badge).
- Mobile: stacked card view.
- "Invite Member" button opens `InviteMemberDialog`.

---

### Components

#### Layout & Navigation

**`Sidebar.jsx`**
Fixed left sidebar containing:
- `<WorkspaceDropdown />` at the top
- Navigation links (Dashboard, Projects, Team) using `NavLink` with active styling
- A Settings button wired to Clerk's `openUserProfile()`
- `<MyTasksSidebar />` — collapsible list of tasks assigned to the current user
- `<ProjectsSidebar />` — collapsible, nested project tree

On mobile, the sidebar overlays the content and closes on outside click (via a `mousedown` event listener on `document`).

**`Navbar.jsx`**
Top bar with:
- A sidebar toggle button (visible on small screens only)
- A search input (UI only — not wired to backend)
- Dark/light theme toggle dispatching `toggleTheme()`
- Clerk's `<UserButton />` for profile/sign-out

**`WorkspaceDropdown.jsx`**
Dropdown that lists all workspaces from Clerk's `useOrganizationList`. Selecting a workspace:
1. Calls Clerk's `setActive({ organization: id })` to switch the Clerk session context
2. Dispatches `setCurrentWorkspace(id)` to update Redux state
3. Navigates to `/`

Includes a "Create Workspace" action that opens Clerk's `openCreateOrganization()` modal.

**`ProjectsSidebar.jsx`**
Collapsible per-project navigation. Each project expands to show four sub-links: Tasks, Analytics, Calendar, Settings. Active state is computed by comparing current pathname and search params.

**`MyTasksSidebar.jsx`**
Collapsible list of all tasks assigned to the current Clerk user across all projects in the current workspace. Each task links directly to its `TaskDetails` page.

---

#### Dashboard Components

**`StatsGrid.jsx`**
Renders four KPI cards derived from the current workspace state:
- **Total Projects** — count of all projects
- **Completed Projects** — sum of tasks in completed projects
- **My Tasks** — tasks where `assignee.email === owner.email`
- **Overdue** — tasks where `due_date < now`

**`ProjectOverview.jsx`**
Lists up to 5 projects with name, description, status, priority dot, member count, end date, and a progress bar. Links each row to the project's task tab. Shows an empty state with a "Create your First Project" CTA if no projects exist.

**`RecentActivity.jsx`**
Flat list of all tasks across all workspace projects, showing the task type icon, title, status badge, assignee initials, and `updatedAt` timestamp.

**`TasksSummary.jsx`**
Three summary cards — "My Tasks", "Overdue", "In Progress" — each showing a count badge and up to 3 preview items. Overflow is surfaced with a "View N more" button.

---

#### Project Components

**`ProjectCard.jsx`**
A compact card linking to the project's detail page. Displays name, description (line-clamped to 2 lines), status badge, priority label, and a progress bar.

**`ProjectTasks.jsx`**
The core task management interface:
- **Filters:** Dropdowns for status, type, priority, and assignee. A "Reset" button appears when any filter is active.
- **Bulk actions:** Checkboxes on each row; a "Delete" button appears when tasks are selected. Dispatches `deleteTask` to Redux after the API call.
- **Inline status editing:** A `<select>` in the status column updates the task immediately via `PUT /api/tasks/:id` and dispatches `updateTask`.
- **Desktop:** Full `<table>` with columns for title, type (with icon), priority (colour-coded badge), status (inline select), assignee (avatar + name), and due date.
- **Mobile:** Card layout replacing the table.
- Clicking a task row navigates to `TaskDetails`.

**`ProjectAnalytics.jsx`**
Uses `useMemo` to compute stats from the `tasks` prop:
- Four metric cards (completion rate, active tasks, overdue tasks, team size)
- Bar chart of tasks by status (`TODO`, `IN_PROGRESS`, `DONE`) via Recharts `BarChart`
- Pie chart of tasks by type via Recharts `PieChart`
- Priority breakdown with animated progress bars

**`ProjectCalendar.jsx`**
A custom monthly calendar built with `date-fns`:
- Renders every day of the current month as a button
- Days with tasks show a task count; overdue days get a red border
- Clicking a day shows a panel listing tasks due that day (with type badge and priority border-left)
- Sidebar panels: "Upcoming Tasks" (next 5 non-done tasks) and "Overdue Tasks" (red-bordered panel)
- Month navigation via `addMonths` / `subMonths`

**`ProjectSettings.jsx`**
Two-column settings panel:
- **Left:** Form to edit project name, description, status, priority, start/end dates, and a progress range slider (0–100, step 5). Submits to `PUT /api/projects`.
- **Right:** Team member list showing each member's email and a "Team Lead" badge. A `+` button opens `AddProjectMember`.

---

#### Dialog / Modal Components

**`CreateProjectDialog.jsx`**
Modal for creating a new project. Fields: name, description, status, priority, start date, end date, project lead (dropdown of workspace members), team members (multi-select with removal chips). Posts to `POST /api/projects` and dispatches `addProject` on success.

**`CreateTaskDialog.jsx`**
Modal for creating a task in a given project. Fields: title (required), description (required), type, priority, assignee (dropdown of project members, required), status, due date (required, min: today). Posts to `POST /api/tasks` and dispatches `addTask` on success.

**`InviteMemberDialog.jsx`**
Modal for inviting users to the current workspace. Uses Clerk's `organization.inviteMember()` to send an email invitation directly from the browser — no backend call needed. Role options: `org:member` or `org:admin`.

**`AddProjectMember.jsx`**
Modal for adding an existing workspace member to a specific project. The dropdown is pre-filtered to exclude users already in the project. Posts to `POST /api/projects/:projectId/addMember`.

---

### Theme System

Dark mode is implemented using Tailwind CSS's `dark:` variant with the `class` strategy. The `dark` class is toggled on `<html>` by the Redux `toggleTheme` action. On app boot, `loadTheme` reads `localStorage` and re-applies the class if the saved theme is `"dark"`. Tailwind's `@custom-variant dark` directive in `index.css` wires the `dark:` utility to the `.dark` class.

The `index.css` file also:
- Imports the **Outfit** font from Google Fonts and applies it globally
- Hides scrollbars on `.no-scrollbar` elements
- Styles custom scrollbars for both light and dark modes
- Inverts the native date-picker calendar icon in dark mode
- Styles checkboxes as circular toggles with a blue accent when checked

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A [Neon](https://neon.tech) PostgreSQL database
- A [Clerk](https://clerk.dev) application with **Organizations** enabled
- An [Inngest](https://www.inngest.com) account (or run `npx inngest-cli@latest dev` locally)
- An SMTP provider for email (optional)

### Environment Variables

#### Backend (`backend/.env`)

```env
# Database
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
DIRECT_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require

# Clerk
CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Inngest
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

# Email (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=yourpassword
SENDER_EMAIL=no-reply@yourapp.com

# Server
PORT=5000
NODE_ENV=development
```

#### Frontend (`frontend/.env`)

```env
VITE_BASEURL=http://localhost:5000
VITE_CLERK_PUBLISHABLE_KEY=pk_...
```

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/soham-lodh/core-work.git
cd core-work

# 2. Install backend dependencies and generate Prisma client
cd backend
npm install          # postinstall runs `npx prisma generate` automatically

# 3. Push the schema to your database
npx prisma db push

# 4. Install frontend dependencies
cd ../frontend
npm install
```

### Running the App

**Terminal 1 — Backend**
```bash
cd backend
npm run dev          # nodemon server.js
```

**Terminal 2 — Inngest Dev Server** (for local webhook/event testing)
```bash
npx inngest-cli@latest dev
# Point your Clerk dashboard's webhook URL to:
# http://localhost:8288/e/<INNGEST_EVENT_KEY>
```

**Terminal 3 — Frontend**
```bash
cd frontend
npm run dev          # vite
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> **First run:** Sign in with Clerk. If you have no organization, you'll be redirected to Clerk's Create Organization flow. Once an org is created, Inngest will sync it to your database automatically.

---

## Deployment

Both the frontend and backend are pre-configured for [Vercel](https://vercel.com).

### Backend (`backend/vercel.json`)

```json
{
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "server.js" }]
}
```

Deploy the `backend/` directory as a separate Vercel project. Set all environment variables in the Vercel dashboard.

The `postinstall` script (`npx prisma generate`) runs automatically during Vercel's build step, ensuring the Prisma client is generated before the server starts.

### Frontend (`frontend/vercel.json`)

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

The catch-all rewrite enables React Router's client-side navigation. Deploy the `frontend/` directory as a separate Vercel project with `VITE_BASEURL` set to the deployed backend URL and `VITE_CLERK_PUBLISHABLE_KEY` set to your Clerk publishable key.

### Clerk Webhook Setup

After deploying the backend, go to your Clerk Dashboard → **Webhooks** → Add endpoint:

- **URL:** `https://your-backend.vercel.app/api/ingest`
- **Events to enable:**
  - `user.created`, `user.updated`, `user.deleted`
  - `organization.created`, `organization.updated`, `organization.deleted`
  - `organizationInvitation.accepted`

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for the full text.

Copyright © 2026 Soham Lodh.
