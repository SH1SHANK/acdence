---
title: "Milestones for Trekking Management Application — V2"
sourceType: pdf
sourceFile: "milestones_tma_v2_sep26.pdf"
course: "CS2006P"
lastVerified: "2026-09-19"
---

# Milestones for Trekking Management Application — V2

> **Official Document Reference**: IIT Madras BS in Data Science and Applications — Modern Application Development II CS2006P Project Milestones Specification (September 2026 Term).

---

## 1. Structure & Completion Guidelines

The project development lifecycle is divided into:

- **Milestone 0**: Repository & Collaborator Setup (Compulsory precondition).
- **Core Requirements (8 Milestones)**: Mandatory features evaluated during Level 1 Viva.
- **Recommended & Optional Enhancements (2 Milestones)**: Evaluated for advanced performance and Best Project nominations.
- **Final Submission Milestone**: Packaging, verification, and portal upload.

> **Important Principles**:
>
> - Core milestones can be completed in any order based on your design flow.
> - Recommended and optional enhancements should only begin after all 8 core milestones are verified.
> - To be considered complete, each milestone requires a commit pushed to GitHub with a distinct, intuitive commit message.
> - All code must be pushed to GitHub prior to submitting the final archive on the viva portal.

---

## 2. Milestone Breakdown Table

| Milestone ID & Name                         | Scope & Key Objectives                                                                                                  | Expected Time | Weight (%) | Cumulative Progress | Git Commit Message Template                       |
| :------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------- | :-----------: | :--------: | :-----------------: | :------------------------------------------------ |
| **Milestone 0: GitHub Repository Setup**    | Private repo creation, README.md, `.gitignore`, invite `MADII-cs2006` collaborator.                                     |     1 day     |     5%     |         5%          | `Milestone-0 TMA-V2 Setup`                        |
| **Milestone 1: Database Models & Schema**   | SQLite schema via Flask/SQLAlchemy: User, Trek, Booking, Staff Profile with relationships. Programmatic Admin creation. |   5–7 days    |    15%     |         20%         | `Milestone-1 Models & Schema Setup`               |
| **Milestone 2: Auth & RBAC**                | Flask-Security / JWT tokens. Trekkers self-register; Staff and Admin login only. Role redirection.                      |    5 days     |    10%     |         30%         | `Milestone-2 Auth & Role-Based Access`            |
| **Milestone 3: Admin Dashboard**            | Admin stats, create/update routes, add/assign staff, search, blacklist users/staff, view history.                       |   7–9 days    |    15%     |         45%         | `Milestone-3 Admin Dashboard & Operations`        |
| **Milestone 4: Trek Staff Dashboard**       | Staff view assigned treks, update slots, toggle Open/Closed status, manage participant list.                            |    7 days     |    15%     |         60%         | `Milestone-4 Staff Dashboard & Operations`        |
| **Milestone 5: User Dashboard & Booking**   | Trekker view open treks, search/filter by difficulty/location/duration, book slots, prevent duplicates.                 |    7 days     |    13%     |         73%         | `Milestone-5 User Dashboard & Booking Flow`       |
| **Milestone 6: Booking Tracking & History** | Booking status lifecycle (`Booked`, `Cancelled`, `Completed`), prevent overbooking, audit logs.                         |   5–6 days    |    12%     |         85%         | `Milestone-6 Booking Lifecycle & Status Tracking` |
| **Milestone 7: Celery Backend Jobs**        | Celery + Redis: daily reminders (Email/SMS/GChat), monthly activity report (HTML/PDF), async CSV export.                |   7–8 days    |    10%     |         95%         | `Milestone-7 Celery Batch Jobs & Reports`         |
| **Milestone 8: API Redis Caching**          | Cache frequently accessed trek endpoints, cache expiry (TTL), programmatic cache invalidation.                          |    3 days     |     5%     |        100%         | `Milestone-8 Redis Caching & Optimization`        |

---

## 3. Recommended & Optional Enhancements

| Enhancement Milestone                 | Objectives & Features                                                                                                  | Expected Time |
| :------------------------------------ | :--------------------------------------------------------------------------------------------------------------------- | :-----------: |
| **UI/UX Enhancements & PWA Features** | Responsive Bootstrap design, mobile optimization, frontend validation, PWA "Add to Home Screen", booking alert toasts. |    6 days     |
| **Reports, Charts & Analytics**       | Chart.js integration, trend graphs, popular trek metrics, public pre-login landing stats, payment simulation.          |    10 days    |

---

## 4. Final Project Submission

| Milestone                    | Deliverables                                                                                                                                                                                                                                      | Expected Time | Git Commit Message                  |
| :--------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-----------: | :---------------------------------- |
| **Final Project Submission** | • Single `.zip` archive containing project root.<br>• 3–5 page PDF report with ER diagram, API catalog, and **mandatory AI declaration %**.<br>• 5–10 minute Google Drive video walkthrough link.<br>• Final pre-submission validation form pass. |    2 days     | `Milestone-TMA-V2 Final-Submission` |
