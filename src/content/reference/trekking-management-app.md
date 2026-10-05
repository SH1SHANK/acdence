---
title: "Trekking Management Application - V2"
sourceType: pdf
sourceFile: "Trekking Management Application V2.pdf"
course: "CS2006P"
lastVerified: "2026-09-18"
---

# Trekking Management Application — V2 (TMA V2)

> **Document Note**: This document outlines the authoritative problem statement, architectural constraints, feature specifications, and deliverable standards for the CS2006P MAD-2 Term Project.

---

## 1. Overview

Adventure organizations require efficient digital platforms to manage trekking expeditions involving trek organizers, operations staff, and adventurous trekkers. The **Trekking Management Application (TMA)** is a multi-role web platform allowing Administrators, Trek Staff, and Trekkers to coordinate expeditions according to their distinct privileges.

---

## 2. Permitted Frameworks & Libraries

All project demonstrations must be fully executable on a local development machine. **Other frameworks/libraries outside this list are strictly prohibited.**

| Component         | Permitted Technology | Restrictions / Special Rules                                                                    |
| ----------------- | -------------------- | ----------------------------------------------------------------------------------------------- |
| **API / Backend** | **Flask**            | RESTful architectural pattern for all endpoints.                                                |
| **Frontend / UI** | **VueJS**            | VueJS for all UI components. Vue CLI allowed if needed.                                         |
| **Templating**    | **Jinja2**           | Permitted **only** as entry-point loader when using CDN; never for UI rendering.                |
| **Styling & CSS** | **Bootstrap**        | Exclusive framework for styling. No Tailwind, Bulma, or custom CSS frameworks.                  |
| **Database**      | **SQLite**           | **Must be created programmatically** via code/models. Manual tools (e.g. DB Browser) forbidden. |
| **Caching Layer** | **Redis**            | In-memory key-value store for caching frequently viewed trek routes.                            |
| **Batch & Async** | **Redis + Celery**   | Celery task workers with Redis broker for background and scheduled jobs.                        |

---

## 3. Roles & Responsibilities

### 1. Admin

The overarching supervisor with supreme system access:

- Pre-existing and created programmatically after database initialization (no registration endpoint for Admin).
- Create, modify, and retire trekking routes.
- Add and manage trek staff accounts.
- Assign trek staff to specific treks.
- Global dashboard monitoring total treks, users, staff, and overall booking metrics.
- Global search and filtering across users, staff, and treks.
- Deactivate or blacklist accounts violating policy.
- Access monthly activity analytics and reports.

### 2. Trek Staff

Operations personnel coordinating assigned treks on the ground:

- Log in only after being created and provisioned by the Admin (no public registration).
- View expeditions specifically assigned to them.
- Manage available slots and change trek operational status (`Open` / `Closed` / `Completed`).
- View registered participants per trek.
- Update milestone progress and participant completion.

### 3. User (Trekker)

Participants booking and embarking on treks:

- Self-registration, login, and profile management.
- Explore open and approved treks.
- Search and filter expeditions by difficulty (`Easy`, `Moderate`, `Hard`), location, and duration.
- Book slots on available treks.
- Review personal booking status and historical trek participation.
- Trigger asynchronous CSV downloads of booking history.

---

## 4. Key Terminologies & Data Entities

### Trek Entity

- `Trek ID`: Unique identifier
- `Trek Name`: Display title
- `Location`: Geographic region / state
- `Difficulty`: `Easy` | `Moderate` | `Hard`
- `Duration`: Days required
- `Available Slots`: Maximum participant capacity
- `Assigned Staff ID`: Foreign key to assigned Trek Staff
- `Status`: `Pending` | `Approved` | `Open` | `Closed` | `Completed`
- `Start Date` & `End Date`

### Booking Entity

- `Booking ID`: Unique identifier
- `User ID`: Foreign key to Trekker
- `Trek ID`: Foreign key to Trek
- `Booking Date`: Timestamp
- `Status`: `Booked` | `Cancelled` | `Completed`
- `Payment Status`: Optional simulation field

### Staff Profile

- `Staff ID`: Unique identifier
- `Name`: Full name
- `Contact Details`: Email / phone
- `Assigned Treks`: Relationships to expeditions

---

## 5. Core System Functionalities & Invariants

### Authentication & Access Control

- Unified user table with distinct role identifiers (`admin`, `staff`, `trekker`).
- Role-based access control (RBAC) enforced via Flask session, tokens, or JWT.
- Exactly **one Admin** account created programmatically during database setup.

### Scheduled Background Jobs (Celery Beat)

1. **Daily Reminders**:
   - Automated daily task sending notifications to trekkers with upcoming expeditions.
   - Includes departure date, gear checklist, and arrival instructions.
   - Dispatched via email, SMS, or Google Chat webhooks.
2. **Monthly Activity Report**:
   - Automated report compiled on the 1st of every month for the Admin.
   - Summarizes total treks conducted, unique trekkers engaged, and most popular routes.
   - Sent to Admin email as formatted HTML or PDF attachment.

### User-Triggered Asynchronous Job (Celery Worker)

- **Async CSV Booking Export**:
  - Trekker requests export of their historical bookings from dashboard.
  - Celery worker generates CSV containing `User ID`, `Trek Name`, `Location`, `Status`, `Dates`.
  - Sends immediate completion notification/alert when file is ready.

### Performance & Caching (Redis)

- Redis cache implemented for frequently accessed expeditions.
- Time-to-live (TTL) cache expiration on dynamic data.
- Noticeable reduction in API response times.

### Business Logic Invariants

- **Capacity Ceiling**: Prevent overbooking beyond available slots.
- **Staff Exclusivity**: Trek modifications restricted solely to the designated assigned staff member.
- **Booking Gate**: Bookings permitted only when trek status is explicitly `Open`.
- **Duplicate Prevention**: Trekkers cannot book the same expedition multiple times concurrently.

---

## 6. Evaluation Deliverables & Submission Standards

### 1. Project Report (Max 5 Pages)

- PDF document containing student identification details.
- Architectural design, ER diagram with relationships, and REST API resource mapping.
- **AI / LLM Disclosure**: Mandatory declaration detailing percentage and context of AI tools used.
- Drive link to the presentation video with open view permissions.

### 2. Video Presentation (5 to 10 Minutes)

- **Introduction**: $\le 30$ seconds.
- **Problem Statement & Approach**: $\approx 30$ seconds.
- **Core Features Walkthrough**: $\approx 90$ seconds.
- **Live Functionality Demo**: Main body.
- Video feed on is recommended.

### 3. ZIP Archive Structure

- All code compressed into a single `.zip` file.
- Single root project folder enclosing all source files and a top-level `app.py` or `main.py`.
