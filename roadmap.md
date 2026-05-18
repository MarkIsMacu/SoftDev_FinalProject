# Agile Scrum SDLC Roadmap - Repair Shop Management System

This roadmap outlines the project lifecycle organized into 4 Agile Sprints.

## Sprint 1: Planning, System Architecture & Environment Setup
**Goal:** Establish the foundation, repository structures, and database schema.
*   **Project Management:** Define user stories and sprint backlog.
*   **Architecture:** 
    *   Initialize Git repository.
    *   Set up decoupled `FRONTEND` and `BACKEND` directory structures.
    *   Create `.gitignore` and essential environment configurations.
*   **Backend:**
    *   Design Entity-Relationship Diagram (ERD) and define API contracts.
    *   Setup the relational database and basic server boilerplate.
*   **Frontend:**
    *   Establish UI/UX wireframes and mockups for the dashboard and login screens.
    *   Initialize the SPA framework and styling architecture.

## Sprint 2: Core Authentication & Customer Management
**Goal:** Secure the system and enable fundamental customer data operations.
*   **Backend:**
    *   Implement User Authentication (JWT/Session based) and Role-Based Access Control (RBAC).
    *   Develop REST APIs for CRUD operations on Customer entities.
*   **Frontend:**
    *   Build the Login and Role selection interface.
    *   Develop the Customer Dashboard (search, list, and profile views).
    *   Integrate API for fetching and creating customer data.

## Sprint 3: Repair Ticket Lifecycle & Technical Workflows
**Goal:** Launch the core functionality for creating and tracking repair tickets.
*   **Backend:**
    *   Implement API endpoints for Repair Tickets and Service History.
    *   Develop backend logic for status tracking (Received -> Released) and history appending.
*   **Frontend:**
    *   Create UI forms for new repair tickets.
    *   Build the Technician Workspace to update ticket statuses and add technical notes.
    *   Ensure real-time UI reflection of ticket status changes.

## Sprint 4: Notifications, Analytics, & Final Polish
**Goal:** Automate communications, deliver business insights, and prepare for deployment.
*   **Backend:**
    *   Integrate email/SMTP services to trigger automated alerts upon "Completed" status.
    *   Develop aggregation APIs for the Admin Dashboard (revenue, ticket counts, performance metrics).
*   **Frontend:**
    *   Build Admin Reporting Dashboard (charts and metrics visualization).
    *   Implement final UI polish and responsive design fixes.
*   **Quality Assurance:** 
    *   Execute System and User Acceptance Testing against SMART goals.
    *   Debug and finalize technical documentation.
*   **Deployment:** Release Version 1.0 to production environments.
