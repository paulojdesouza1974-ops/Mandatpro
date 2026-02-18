# KommunalCRM - Product Requirements Document

## Original Problem Statement
User requested to improve an existing German municipal CRM application called "KommunalCRM" and remove all Base44 SDK dependencies to make it a standalone application.

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Authentication**: Token-based (localStorage)

### Project Structure
```
/app
├── backend/
│   └── server.py          # FastAPI server with all CRUD endpoints
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── base44Client.js  # Custom API client (replaces Base44 SDK)
│   │   ├── components/
│   │   │   ├── dashboard/       # Dashboard components
│   │   │   └── ui/              # UI components (shadcn/ui)
│   │   ├── lib/
│   │   │   └── AuthContext.jsx  # Authentication context
│   │   ├── pages/               # All pages
│   │   └── Layout.jsx           # Main layout with dark sidebar
│   └── index.html
└── design_guidelines.json
```

## User Personas
1. **Local Politicians** - Municipal council members managing contacts, motions, meetings
2. **Political Party Members** - Managing campaigns and organization activities
3. **Political Associations** - Managing members, finances, and events

## Core Requirements (Static)
- [x] Contact management
- [x] Motion/proposal management
- [x] Meeting scheduling and calendar
- [x] Communication tracking
- [x] Document management
- [x] Task management
- [x] User authentication
- [x] Organization management
- [x] German language interface

## What's Been Implemented

### Feb 18, 2026
1. **UI/UX Redesign**
   - Dark sidebar navigation (Slate 900 background)
   - Modern color scheme with Sky Blue accent
   - Public Sans font for headings, Inter for body
   - Improved stat cards with colored icons
   - Enhanced calendar view
   - Mobile responsive design with bottom navigation

2. **Base44 SDK Removal**
   - Created custom FastAPI backend with 25+ entity endpoints
   - Implemented token-based authentication
   - Created custom API client (base44Client.js)
   - Added Login/Register page
   - Demo login functionality with seeded data

3. **Backend Features**
   - User registration and login
   - Token-based session management
   - CRUD operations for all entities:
     - Contacts, Motions, Meetings, Communications
     - Tasks, Documents, Campaigns, Organizations
     - And more...
   - Demo data seeding endpoint

4. **Bug Fix: Fraktion/Verband Switch**
   - Added `PUT /api/auth/me` endpoint for updating user profile
   - Added `updateMe()` function in API client
   - Navigation now updates correctly when org_type changes

5. **Professional DATEV-Compliant Accounting (SAP/DATEV Level)**
   - **SKR03 Kontenrahmen** - Standard German chart of accounts for associations
   - **DATEV EXTF Export** - Buchungsstapel format compatible with:
     - DATEV Unternehmen online
     - DATEV Mittelstand Faktura
     - Steuerberater Belegimport
   - **Tax Codes (Steuerschlüssel)**:
     - 0 = Keine Steuer, 1 = Steuerfrei
     - 2/3 = 7%/19% USt, 8/9 = 7%/19% VSt
   - **Automatic Account Assignment** based on category
   - **Cost Center Support** (KOST1/KOST2)
   - **Improved Forms** with Grunddaten/Buchhaltung tabs
   - **Net/Gross/Tax Calculation** in expense form
   - **Validation before Export** with error/warning display
   - **Date Range Filtering** for exports (year, quarter, custom)

6. **Fraktionssitzungen Management (Fraktion Mode)**
   - **Full Meeting Lifecycle** - Create, edit, delete meetings
   - **Status Tracking**: Geplant → Einladung versendet → Abgeschlossen/Abgesagt
   - **Tagesordnung** - Agenda management with preformatted templates
   - **Teilnehmerverwaltung** - Attendee management via email
   - **KI-Protokollgenerierung** - GPT-4o powered protocol generation
     - Takes meeting notes/bullet points as input
     - Generates formal German meeting protocols
     - Includes all standard sections (attendees, agenda, votes, signatures)
   - **KI-Einladungsgenerierung** - AI-powered invitation text creation
   - **PDF Export** - Download invitations and protocols as PDF
   - **E-Mail-Versand** - Send invitations to attendees with PDF attachment (SIMULATED - needs SendGrid integration)
   - **Protokoll-Upload** - Upload previous meeting protocols

## Prioritized Backlog

### P0 (Critical)
- [x] Authentication system
- [x] Basic CRUD operations
- [ ] Organization setup flow for new users

### P1 (High Priority)
- [ ] File upload for documents
- [ ] Email notifications
- [ ] Export functionality (PDF, Excel)

### P2 (Medium Priority)
- [ ] Dashboard analytics/charts with real data
- [ ] Dark mode toggle
- [ ] Search functionality across all entities

### P3 (Low Priority)
- [ ] Bulk import contacts
- [ ] Calendar integrations
- [ ] Mobile app (PWA enhancements)

## Next Tasks
1. Implement organization setup flow for new users
2. Add file upload capability for documents
3. Implement search functionality
4. Add real-time data to dashboard charts
5. Consider adding email notification system

## Demo Credentials
- **Email**: demo@kommunalcrm.de
- **Password**: demo123
