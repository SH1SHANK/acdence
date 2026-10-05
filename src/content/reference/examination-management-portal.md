---
title: "Examination Management Portal - V2"
sourceType: pdf
sourceFile: "appdev2_project_statement_sep26.pdf"
course: "CS2006P"
lastVerified: "2026-09-19"
---

# Examination Management Portal — V2 (EMP V2)

> **Official Document Reference**: IIT Madras BS in Data Science and Applications — CS2006P Modern Application Development II Project Statement 1 (September 2026 Term).

---

## 1. Overview

Educational institutions require efficient, reliable software systems to manage end-to-end examination processes involving administrators, evaluators (examiners), and candidates (students). Many academic workflows currently rely on spreadsheets, manual emails, and disparate forms, creating friction in slot scheduling, examiner capacity allocation, student booking, rubric-based evaluation, and transparent score publication.

The **Examination Management Portal (EMP)** is a multi-role web platform built to automate and coordinate examination workflows between Administrators, Examiners, and Students.

---

## 2. Permitted Frameworks & Technology Stack

All demonstrations must be conducted locally on your development machine. **No frameworks or libraries outside this mandatory specification are permitted.**

| Layer             | Permitted Technology | Rules & Constraints                                                                            |
| :---------------- | :------------------- | :--------------------------------------------------------------------------------------------- |
| **API / Backend** | **Flask**            | RESTful architectural API endpoints.                                                           |
| **Frontend / UI** | **VueJS**            | VueJS for all user interfaces. Vue CLI allowed if required.                                    |
| **Templating**    | **Jinja2**           | Permitted **only** as entry-point loader when using CDN; forbidden for UI components.          |
| **Styling**       | **Bootstrap**        | Exclusive styling framework. No Tailwind, Bulma, or alternative CSS libraries.                 |
| **Database**      | **SQLite**           | **Must be created programmatically** via Python code/ORM models. Manual DB creation forbidden. |
| **Caching Layer** | **Redis**            | In-memory cache for frequently accessed exams, schedules, and rubrics.                         |
| **Batch & Async** | **Redis + Celery**   | Celery workers and Redis broker for scheduled alerts, monthly reports, and async CSV exports.  |

---

## 3. User Roles & Core Functionalities

### 1. Admin (Superuser)

- Exactly one Admin pre-exists and is created **programmatically** during initial database setup (no registration endpoint).
- Create, modify, and manage courses.
- Create, configure, and manage examinations and timelines.
- Define and configure examination rubrics and evaluation criteria.
- Provision and manage examiner profiles.
- Control examination cycles: open/close examiner slot creation and student slot booking.
- Global dashboard monitoring total courses, examinations, students, examiners, slots, and bookings.
- Administrative interventions: reschedule bookings and reassign examiners in exceptional situations.
- Search students, examiners, exams, and bookings.
- Publish official examination results and view comprehensive analytics.

### 2. Examiner

- Can log in only after account creation by Admin (no public registration).
- View assigned courses and examinations.
- Create available examination slots during the designated slot creation window.
- Update or delete slots prior to student booking commencement.
- View roster of students booked in their slots.
- Conduct assessments and evaluate students using the predefined rubric criteria.
- Submit marks and qualitative remarks.
- Mark examination sessions as completed.

### 3. Student

- Self-registration, login, and profile management.
- View available upcoming examinations and schedules.
- Search and filter examinations.
- Book available examination slots (strictly one slot per examination).
- View booking confirmation status.
- Cancel bookings prior to the booking deadline.
- View historical examination records, published scores, and examiner feedback.

---

## 4. Key Entities & Data Attributes

### Course

- `Course ID`, `Course Code`, `Course Name`, `Description`, `Status`

### Examination

- `Exam ID`, `Course ID` (Foreign Key)
- `Examination Name`, `Examination Type` (`Viva` | `Practical` | `Project Demo` | `Assessment`)
- `Duration`, `Maximum Marks`
- `Slot Creation Start/End Dates`, `Slot Booking Start/End Dates`
- `Examination Status` (`Draft` | `Slot Creation` | `Booking Open` | `Closed` | `Completed`)

### Examination Rubric

- `Rubric ID`, `Examination ID` (Foreign Key)
- `Criterion Name`, `Maximum Marks`, `Weightage`, `Description`

### Examination Slot

- `Slot ID`, `Examination ID`, `Examiner ID` (Foreign Keys)
- `Date`, `Start Time`, `End Time`
- `Maximum Student Capacity`, `Available Seats`
- `Status` (`Available` | `Full` | `Cancelled` | `Completed`), `Meeting Link` (Optional)

### Booking

- `Booking ID`, `Student ID`, `Slot ID` (Foreign Keys)
- `Booking Date`, `Status` (`Booked` | `Cancelled` | `Completed`)

### Evaluation

- `Evaluation ID`, `Booking ID`, `Student ID`, `Examiner ID` (Foreign Keys)
- `Total Marks`, `Remarks`, `Evaluation Date`, `Status`

---

## 5. Backend Asynchronous & Scheduled Jobs (Celery + Redis)

1. **Daily Examination Reminders (Scheduled Job)**:
   - Automated Celery Beat task running daily at a configured time.
   - Dispatches notifications containing exam name, date/time, examiner, and instructions.
   - Delivery channels: Google Chat Webhooks, Email, or SMS.
2. **Monthly Examination Activity Report (Scheduled Job)**:
   - Generated automatically on the 1st of every month for the Administrator.
   - Aggregates exams conducted, candidates evaluated, completed bookings, pending evaluations, and examiner workload.
   - Delivered to Admin via Email as HTML or PDF.
3. **Async CSV History Export (User-Triggered Job)**:
   - Students can export their complete examination history from their dashboard.
   - Celery worker generates CSV containing Student ID, Exam Name, Course, Date, Examiner, Marks, and Status.
   - Generates an alert/notification upon export completion.

---

## 6. Performance Optimization & Caching Strategy

- Cache frequently accessed examinations and public schedule endpoints using Redis.
- Implement cache expiry policies (TTL) and programmatic invalidation upon slot updates.
- Optimize query execution and avoid N+1 queries using eager loading (`joinedload`).

---

## 7. Operational & Business Invariants

- **Slot Window Enforcement**: Examiners can create slots only during slot creation windows; students can book only during booking windows.
- **Single Booking Invariant**: Students can book only one slot per examination.
- **Capacity Enforcement**: Prevent overbooking beyond available seats; slots automatically marked `Full` when capacity is exhausted.
- **Evaluator Boundary**: Examiners can only grade students booked in their own slots.
- **Immutable History**: Maintain complete audit logs of historical bookings, evaluations, and admin reassignments.

---

## 8. Deliverables & Evaluation Checklist

- **Code Submission**: Single `.zip` archive containing the root project folder and Python entry-point (`app.py`).
- **Project Report**: PDF/DOCX of **strictly 3 to 5 pages** containing approach, ER diagram, API catalog, and **mandatory AI/LLM declaration percentage**.
- **Presentation Video**: 5 to 10 minute Google Drive video walkthrough.
- **Live Viva Demonstration**: Ability to launch the application locally within **10 minutes** of checksum verification and perform live code edits.
