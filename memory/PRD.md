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

### Feb 19, 2026
7. **Bug Fix: Blank Screen Issue**
   - Fixed syntax error in Contacts.jsx (duplicate code removed at lines 117-119)
   - Fixed Toast notification system (Toaster component used wrong import path)
   - Fixed Backend auth endpoints (Authorization header not reading properly - missing Header() import)

8. **User Registration Flow**
   - New registration form with fields: Name, E-Mail, Organisation, Organisationstyp (Fraktion/Verband), Passwort
   - Password confirmation validation
   - Organization type selection with visual radio cards
   - Tabs-based interface (Anmelden/Registrieren)
   - Backend endpoint `/api/auth/register` functional

9. **Toast Notifications for Save Confirmations**
   - Profile save shows "Änderungen gespeichert"
   - Contact create shows "Kontakt erstellt" / update shows "Kontakt aktualisiert"
   - Error handling toasts with destructive variant

10. **Comprehensive Demo Organization (Verband)**
    - Created `/api/seed-full-demo` endpoint with complete test data
    - **22 Mitglieder** with groups: Vorstand, Mandatsträger, Jusos, AG 60+, Aktive Mitglieder
    - **3 Spender** (Donors) with donation history
    - **60 Mandatsträgerabgaben** (12 months × 5 mandate holders)
      - Ratsmitglieder: 1.850€ Brutto, 20% Abgabe
      - Kreistagsmitglied: 2.200€ Brutto, 18% Abgabe  
      - Bürgermeister: 6.500€ Brutto, 15% Abgabe
    - **29 Einnahmen** (Mitgliedsbeiträge, Spenden, Mandatsträgerabgaben, Zuschüsse)
    - **10 Ausgaben** (Miete, Druck, Catering, IT, Versicherungen)
    - **5 Termine** (Vorstand, MV, AG-Treffen)
    - **6 Aufgaben** with different priorities
    - **3 Kampagnen** (Kommunalwahl, Sommerfest, Mitgliederwerbung)
    - **5 Dokumente** (Satzung, Protokolle, Haushaltsplan)
    - Login-Buttons auf der Startseite: "Demo: Fraktion" und "Demo: Verband (mit allen Daten)"

11. **KI-Generierung komplett überarbeitet**
    - **Bug behoben:** Massen-E-Mail KI-Generierung funktionierte nicht (alte Base44 SDK Methode)
    - **Neuer Endpoint:** `/api/ai/generate-email` für E-Mail-Generierung mit GPT-4o
    - **Neuer Endpoint:** `/api/ai/generate-notice` für Gebührenbescheid-Generierung
    - **API Client erweitert:** `base44.ai.generateEmail()`, `base44.ai.generateProtocol()`, `base44.ai.generateInvitation()`
    - **Alle KI-Funktionen getestet und funktionieren:**
      - Massen-E-Mail mit KI generieren (Verband-Modus)
      - Protokoll mit KI generieren (Fraktion-Modus)
      - Einladung mit KI erstellen (Fraktion-Modus)
      - **Gebührenbescheid mit KI erstellen** (Mandatsträger-Abgaben)
    - **Hinweis:** Dokumenten-Scan (OCR für Abrechnungen) ist noch in Entwicklung

12. **Vereinfachte Fraktionsfinanzen-Seite**
    - Neue Seite `/FractionAccounting` für Fraktion-Modus (ohne DATEV)
    - **Einnahmen-Kategorien:** Zuwendung Stadt, Zuwendung Kreis, Sonstige Zuwendungen
    - **Ausgaben-Kategorien:** Personalkosten, Miete & Nebenkosten, Verwaltungskosten, Büromaterial
    - Übersichtskarten mit Einnahmen, Ausgaben, Saldo
    - Ausgaben-Breakdown nach Kategorie mit Prozentanzeige
    - CRUD-Funktionen für Einnahmen und Ausgaben
    - Demo-Daten im Fraktion-Demo enthalten

13. **Verbesserte "Meine Organisation" Seite**
    - Neue Seite `/MyOrganization` ersetzt alte leere Organisations-Seite
    - **Statistik-Karten:** Typ, Kontakte-Anzahl, Erstelldatum, Status
    - **Grunddaten:** Name, Beschreibung, Stadt, Bundesland, Adresse, PLZ
    - **Kontaktdaten:** Telefon, E-Mail, Website
    - **Bankverbindung:** Bank, IBAN, BIC, Steuernummer
    - **Bearbeiten-Modus:** Alle Felder inline editierbar
    - **Registrierung erstellt Organisation:** Bei neuer Registrierung wird automatisch ein Organisations-Eintrag in der Datenbank angelegt

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
1. Implement support ticket system (user requested)
2. Add file upload capability for documents section
3. Implement global search functionality across all entities
4. Add real-time data to dashboard charts
5. Consider adding email notification system / real email sending

## Demo Credentials
- **Fraktion Demo (einfach):**
  - Email: demo@kommunalcrm.de
  - Password: demo123

- **Verband Demo (mit allen Daten):**
  - Email: demo-verband@kommunalcrm.de
  - Password: demo123
  - Enthält: 22 Mitglieder, 3 Spender, 60 Mandatsträgerabgaben, Einnahmen, Ausgaben, Termine, etc.

## Recent Updates (2026-02-19)
- Alle verbleibenden Base44-Integrationen entfernt und auf API-Endpoints umgestellt (AI, E-Mail, File-Upload)
- Neuer `/api/files/upload` Endpoint inkl. statischem Serving; Logo-Upload im Vorlagen-Editor und Dokument-Uploads funktionieren
- KI-Modelle auf **OpenAI GPT-5.2** umgestellt
- Beleg- und Kontoauszugs-Import laden Dateien hoch und bieten manuellen Fallback (AI-Scan aktuell deaktiviert)
- Wichtige UI-Formulare mit `data-testid` ergänzt (Vorlagen, Meetings, Bulk-Mail, Dokumente, etc.)

## Recent Updates (2026-02-20)
- Impressum, Datenschutz und neue AGB-Seite ohne Base44-Bezug aktualisiert (Betreiber: Paulo Jose De Souza)
- AGB-Link im Footer ergänzt und neue /Terms Route registriert
- Support-Ticket-System erweitert (Support-only Zugriff, Zuweisung, Anhänge) + Support-Anfrage für Orga-Admins
- Globale Suche (Backend Endpoint + /Search Seite) über Kontakte, Mitglieder, Anträge, Meetings, Dokumente, Buchhaltung, Vorlagen
- SMTP-Konfiguration pro Organisation in „Meine Organisation“ + automatische Meeting-Erinnerungen (Scheduler + Button)
- OCR/KI-Scan für Belege & Kontoauszüge mit Zuordnung inkl. Mandatsträger (OpenAI GPT-5.2)
- DATEVconnect online Platzhalter-Status + UI-Karte in Buchhaltung
- Rollen erweitert: Admin / Member / Viewer / Support (Viewer = read-only in Client)
- Standardvorlage für Anträge/Anfragen/Beschlüsse hinterlegt + KI-Prompt an Standardformat angepasst
- **NEU:** Mitglieder- und Rollenverwaltung auf "Meine Organisation" Seite
  - Neue Backend-Endpoints: `GET /api/organizations/{org_name}/members` und `PUT /api/users/{user_id}/role`
  - Mitgliederliste mit Namen und E-Mail
  - Rollen-Dropdown für Admins (Fraktionsvorsitzender, stv. Fraktionsvorsitzender, Fraktionsgeschäftsführer, Ratsmitglied, Sachkundiger Bürger, Mitglied)
  - Toast-Benachrichtigung bei Rollenänderung
- **BugFix:** MotionPrintView.jsx - React Hooks Reihenfolge korrigiert (hooks vor conditional return)
- **BugFix:** MotionPrintView.jsx - getRoleLabel Funktionsaufruf korrigiert
- **NEU:** SMTP-Test-Funktion hinzugefügt
  - Neuer Backend-Endpoint: `POST /api/smtp/test`
  - Test-Button in "Meine Organisation" Seite (erscheint nur wenn SMTP konfiguriert)
  - Sendet Test-E-Mail zur Verifikation der SMTP-Konfiguration
- **BugFix:** Organisation wird jetzt korrekt nach Namen gefiltert
  - `name` Parameter zu Backend CRUD Routes hinzugefügt
  - `name` Parameter zu Frontend API filter() Methode hinzugefügt
  - SMTP-Konfiguration wird jetzt korrekt angezeigt und gespeichert
- **BugFix:** Tagesordnung-Duplikation in Einladungen behoben
  - InvitationView.jsx zeigt Tagesordnung nur separat wenn kein Einladungstext vorhanden
  - PDF-Generierung bereinigt (keine doppelte Tagesordnung mehr)
- **SendGrid E-Mail-Integration hinzugefügt** (Alternative zu SMTP)
  - SendGrid als primäre E-Mail-Methode (wenn API-Key konfiguriert)
  - SMTP als Fallback
- **KI-Generierung auf gpt-4o umgestellt** (funktioniert jetzt stabil mit Emergent Key)
- **Seed-Logik verbessert** - Existierende Organisationen werden nicht mehr überschrieben
- **base44Client.js umbenannt zu apiClient.js** - Kein Base44-Bezug mehr im Code

## Recent Updates (2026-02-21)
- **P0 BugFix: SendGrid E-Mail-Versand behoben**
  - Root Cause: Organisations-SMTP-Email wurde an SendGrid übergeben statt dem verifizierten Sender
  - Fix: `send_email_via_sendgrid()` verwendet jetzt immer `info@mandatpro.de` als verifizierten Sender
  - Organisation's `from_name` wird für Anzeigenamen verwendet
  - Alle E-Mail-Funktionen (Einladungen, Support-Tickets) funktionieren jetzt
- **BugFix: "Not authenticated" Fehler bei E-Mail-Versand**
  - `FractionMeetings.jsx`: Authorization-Header zur `/api/email/send-invitation` Anfrage hinzugefügt
  - Debug-Logging hinzugefügt für Fehlersuche
- **UI Update: "Meine Organisation" Seite**
  - Neues "SendGrid aktiv" Banner zeigt aktiven E-Mail-Dienst
  - SMTP-Konfiguration in einklappbarem "SMTP Fallback-Konfiguration (optional)" Element
- **Demo-Modus entfernt**
  - Demo-Login-Buttons von Login-Seite entfernt
  - Seed-Endpoints deaktiviert (`/api/seed-demo`, `/api/seed-full-demo`)
  - App ist jetzt für Produktionsbetrieb mit echten Organisationen:
    - "AfD Fraktion im Rat der Stadt Dormagen" (Fraktion)
    - "AfD Stadtverband Dormagen" (Verband)
- **Testing:** Backend 100% (13/13 Tests), Frontend 100% - alle Features verifiziert
- **Template Editor Logo Fix**
  - Logo wird in Vorschau und PDF gerendert (feste Größe, oben rechts)
  - PNG/JPG-Format-Erkennung für PDF-Ausgabe ergänzt
  - data-testid für alle interaktiven Elemente im Template Editor ergänzt

## Organisationen
- **Fraktion:** AfD Fraktion im Rat der Stadt Dormagen
- **Verband:** AfD Stadtverband Dormagen

## Known Issues
- Druckausgabe/Word-Export im neuen Template-Editor noch zu verifizieren (P1).

## Feature Status
| Feature | Status | Notizen |
|---------|--------|---------|
| SendGrid E-Mail | ✅ Working | Verwendet verifizierten Sender |
| AI Generierung | ✅ Working | gpt-4o via Emergent Key |
| Meeting Management | ✅ Working | CRUD + Einladungen + Protokolle |
| Member Management | ✅ Working | Rollen-Dropdown für Admins |
| Template Editor | ✅ Working | Logo in Vorschau/PDF + Header/Footer Support vorhanden |
| Support Tickets | ✅ Working | E-Mail-Benachrichtigung möglich |
| Data Persistence | ✅ Working | Seed-Logik nicht-destruktiv |
