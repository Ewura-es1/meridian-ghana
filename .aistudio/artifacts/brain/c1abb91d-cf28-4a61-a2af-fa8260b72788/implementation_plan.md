# Meridian Youth Internship Registry (Ghana Only)

A Ghana-exclusive internship discovery, source verification, and private document review platform connecting young applicants across all 16 regions of Ghana with legitimate, administrator-verified internships and human-reviewed CVs and cover letters.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Workspace Inspection Finding & Zero-Cost Architecture**
> Inspecting the current workspace shows it contains the fresh starter template (React 19, TypeScript, Vite, Tailwind CSS v4, Express, Node.js v22, Lucide icons, and Google AI SDK) with an empty root component and no pre-existing backend, database, or Meridian Registry pages yet. Rather than adding paid third-party services, this plan builds directly onto your existing stack using built-in Node.js capabilities so the entire platform runs **100% free** with real authentication, private file storage, and relational persistence.

- **Recommended Backend & Persistence (Zero Paid Services)**: Use the installed Express server with Node.js built-in SQLite (`node:sqlite`) and private server-side file storage, paired with HTTP-only signed session cookies (`scrypt` password hashing). This supports full Email/Password registration for Young Applicants, Document Editors, and Administrators without requiring paid hosting or manual external auth console setup, and cleanly migrates to PostgreSQL/Supabase and object storage later.
- **Strict Ghana-Only Enforcement**: Every opportunity requires explicit confirmation of Ghana physical presence, a Ghana-operating organization open to Ghana residents, or a remote placement explicitly confirmed open to applicants living in Ghana—foreign-only or unverified international listings are blocked at both validation and UI levels.
- **Public Sources & Labelled Demo Data Only (No Voter or Campaign Data)**: All seeded and sample listings are strictly internship opportunities (clearly tagged as `[DEMO]` demonstration data or linked to verified public institutional portals), and the platform never collects, stores, or displays voter, political, or campaign data.
- **AI Writing Assistance Gate**: Optional server-side Gemini (`gemini-4-hydrogen`) grammar and clarity suggestions will strictly preserve original facts, label suggestions clearly apart from human editor decisions, and only run when an applicant gives explicit per-document consent.

---

## 1. Overview, Existing App Inspection & Core Concept

### Inspection of Existing Application
- **Current Stack Present**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Express 4, Node.js `v22.23.5`, `lucide-react`, `motion`, and `@google/genai`.
- **Existing Files Requiring Modification**:
  - HTML entry point and app metadata: Update title, OpenGraph tags, branding (`Meridian Youth Internship Registry`), and font imports.
  - Global stylesheet: Add institutional color tokens, font definitions, and accessible focus states in Tailwind v4.
  - Package configuration: Add a server start script (`tsx server.ts`) and lightweight server dependencies (`cookie-parser`, `multer` for multipart PDF/DOCX uploads, `mammoth` / `pdf-parse` for safe text extraction/preview) if approved.
  - Root application entry: Replace the empty placeholder with the full router, authentication session provider, and role-aware shell.
- **Potential Breaking Changes**: None—because the current workspace only has the initial starter files, adding the Express API server and React views will not overwrite any pre-existing custom business logic.

### Strict Ghana-Only Geographic System
- **Eligibility Rule**: An opportunity is eligible only if it is (1) physically located in one or more of Ghana's 16 regions, (2) hosted by an organization operating in Ghana for Ghana residents, or (3) explicitly confirmed remote-from-Ghana. Listings requiring relocation abroad or lacking evidence of Ghana eligibility are rejected.
- **All 16 Regions Supported**: Greater Accra, Ashanti, Western, Western North, Central, Eastern, Volta, Oti, Northern, Savannah, North East, Upper East, Upper West, Bono, Bono East, Ahafo, plus an explicit **Multi-Region (Across Ghana)** option. Never invent a city or region if unspecified.
- **20+ Ghana-Relevant Categories**: Technology and IT, Software Development, Engineering, Business and Administration, Finance and Accounting, Banking, Marketing and Communications, Media and Journalism, Law, Healthcare and Public Health, Education, Agriculture, Environmental Science, Research, Human Resources, Social Work and Community Development, Hospitality and Tourism, Government and Public Administration, NGO and Nonprofit, and Entrepreneurship (extensible by Administrators).
- **Clear Demonstration Labelling**: Initial sample listings and user accounts will be clearly marked as **Demonstration Data** (using illustrative Ghanaian scenarios without fabricating active vacancies or fake endorsements for real institutions).

---

## 2. User Experience, Visual Design & Page-by-Page Plan

### Visual Identity & Theme
- **Aesthetic Direction**: Official, calm, institutional Ghanaian youth development service—built for clarity, low cognitive load, and high trust.
- **Color Palette (60-30-10 Rule)**:
  - *60% Neutral Canvas*: Crisp White (`#FFFFFF`) primary canvas with Light Grey (`#F4F6F9`) secondary panels and subtle `1px` borders (`#E2E8F0`).
  - *30% Institutional Navy*: Deep Navy Blue (`#0F294A`) for primary navigation anchors, structural headers, primary buttons, and dark institutional hero/footer bands.
  - *10% Teal / Emerald Accent & Semantic States*: Deep Teal (`#0D9488`) for active filters, focus rings, and interactive highlights; Green (`#15803D`) for Verified, Amber (`#B45309`) for Closing Soon / Changes Suggested, Red (`#B91C1C`) for Expired / Errors Requiring Correction, and Blue (`#1D4ED8`) for Editor Comments. Every state pairs color with an explicit text label or icon.
- **Typography & Spatial Discipline**:
  - *Display & Navigation*: `Plus Jakarta Sans` (SemiBold/Bold, `text-wrap: balance`, no orphan headline words).
  - *Body Prose*: `Public Sans` (15–16px, 1.6 line-height, 65–75ch reading measure).
  - *Dates, Deadlines & Counts*: `JetBrains Mono` with `tabular-nums` for vertical alignment.
  - *Anti-Clutter Rules*: Zero static pill badges on cards (metadata uses clean inline text with `·` separators), single-line top navigation (`Home`, `Find Internships`, `Ghana Regions`, `My Dashboard`, `My Documents`, plus role-contextual `Login` / `Account` primary action), single-elevation flat cards, and zero fake scoreboards or status dots.

### Page-by-Page Application Plan

| Page / Route | Audience | Core Purpose & Key Interactions |
| :--- | :--- | :--- |
| **Home (`/`)** | Public & All Roles | Displays headline *"Find Internship Opportunities Across Ghana"*, instant keyword + region search bar, 16-region quick explorer, industry category grid, **Recently Verified** and **Closing Soon** Ghana internships, and a clear explanation of the private Document Review Service. |
| **Find Internships (`/internships`)** | Public & All Roles | Full search & filter workspace: keyword, Ghana region (16 + Multi-Region), city/district, category/industry, organization, qualification level, work arrangement (On-site / Hybrid / Remote from Ghana), and verification/deadline status, with sorting (`Newest`, `Closing Soon`, `Recently Verified`) and one-click filter reset. |
| **Categories & Ghana Regions (`/categories`, `/regions`)** | Public | Dedicated visual indexes grouping verified active Ghana opportunities by all 20 industries and all 16 administrative regions so students can browse regionally or by field. |
| **Internship Detail (`/internships/:id`)** | Public & Applicants | Complete specification: organization overview, Ghana region/city, work arrangement, responsibilities, qualifications, eligibility, required skills & documents, duration & compensation (`"Not specified"` when unknown), official application URL (clearly separated from internal links), original source URL, verification status, last-checked date, Save toggle, and Report Listing action. |
| **Register & Login (`/register`, `/login`)** | Guests | Email/password registration and login with role-safe applicant onboarding, age-confirmation safeguard (parent/guardian notice for minors under 18), Ghana Data Protection Act (Act 843) privacy consent notice, and clear demo account quick-fill buttons for testing Applicant, Editor, and Admin views. |
| **Applicant Dashboard (`/dashboard`)** | Young Applicant | Personalized home showing profile completion, application preparation checklist, recommended Ghana internships matching preferred regions/industries, saved & recently viewed opportunities, upcoming deadline alerts, document review tracker, and in-app notifications. |
| **My Documents (`/documents`)** | Young Applicant | Private vault to upload PDF/DOCX CVs, cover letters, motivation letters, and personal statements (server-validated, size-capped), view version history, preview extracted text/PDF safely via short-lived signed tokens, request a review, replace/download/delete files, or request account deletion. |
| **Document Review Workspace (`/reviews/:id`)** | Applicant & Assigned Editor | Split-pane review workspace: original document preview alongside editable draft text, color-coded annotations (Red = errors, Yellow = improvements, Green = accepted, Blue = editor comments), side-by-side before/after diff comparison, 8-step status tracker, optional consented Gemini grammar/clarity suggestions (strictly labeled as AI suggestions), and action controls (`Save Draft`, `Submit Revision`, `Return for Clarification`, `Approve`, `Mark Complete`). |
| **Editor Dashboard (`/editor`)** | Document Editor | Focused queue displaying **only** documents explicitly assigned to that editor: pending assignments, active reviews, returned revisions, and completed review history. |
| **Administrator Dashboard (`/admin`)** | Administrator | Platform statistics sourced from live database counts (clearly labelled when showing demo seed data) plus management tabs: Opportunities & Ghana-Eligibility Gate, Source Verification Queue (manual verify/close/expire + audit log), Categories & Regions, Users & Editor Role Management, Document Review Assignment Queue, Reported Listings, Announcements, and Audit Logs. |
| **About, Contact, Privacy Policy & Terms (`/about`, `/contact`, `/privacy`, `/terms`)** | Public | Platform mission, placeholder configurable organization branding, support contact form, transparent data minimization & retention policy aligned with Ghana's Data Protection Act, 2012 (Act 843) principles (explicitly noting legal review is required before official deployment), and terms of use. |

### Core Opportunity Discovery & Lifecycle Flows

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. PUBLISHED OPPORTUNITY & OFFICIAL LINK DISCOVERY                           │
│    Home / Find Internships (filter: Greater Accra · Software Development)    │
│      └─► Shows only active Verified / Closing Soon Ghana opportunities       │
│      └─► Example: "[DEMO] Junior Software Engineering Intern — Greater Accra"│
│      └─► Opens Detail Page (/internships/:id) showing verification date,     │
│          source URL, Ghana eligibility proof & requirements                  │
│      └─► User clicks "Apply on Official Portal ↗" (external URL, new tab)    │
├──────────────────────────────────────────────────────────────────────────────┤
│ 2. EXPIRED LISTING LEAVING ACTIVE VIEW                                       │
│    Deadline passes (deadline < current_date)                                 │
│      └─► Server auto-marks listing status = "Expired"                        │
│      └─► Immediately excluded from Home, Find Internships & Region feeds     │
│      └─► Applicants who saved it receive an in-app "Opportunity Expired" alert│
│      └─► Remains visible only in Admin Queue or "Show Expired Archive" toggle│
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Published Opportunity Display**: Active listings show the organization name, Ghana region and city/district, work arrangement, deadline status (`Open` or `Closing Soon`), verification status (`Verified` + last-verified date), and a clear `[DEMO]` label when using demonstration data—with zero political, voter, or campaign content.
- **Finding & Opening the Official Application Link**: On the Opportunity Detail page, internal actions (*Save Opportunity*, *Prepare / Review Documents*, *Report Listing*) are visually separated from the primary external **Apply on Official Portal** button, which displays the destination domain and opens the official URL in a new tab (`rel="noopener noreferrer"`).
- **Expired Listing Removal**: Default public queries filter out `Expired` and `Closed` listings automatically. When a listing's deadline passes (or an Admin closes it, or we demonstrate a past-deadline demo listing), it leaves the active discovery view immediately while preserving historical records for Admins and saved-list notifications.

---

## 3. Key Product Decisions, External Services & Implementation Roadmap

### Key Architectural Decisions & Trade-Offs
- **Express + Node SQLite (`node:sqlite`) vs. Firebase / Cloud SQL**:
  - *Chosen Approach*: Single-server Express API (`server.ts`) backed by SQLite (`node:sqlite`) and private local disk storage (`storage/private_docs/`) with `scrypt`-hashed passwords and HTTP-only signed session cookies.
  - *Why*: Meets every security rule (no `localStorage` document storage, private non-public document downloads, strict server-side RBAC), works immediately with Email/Password for all 3 roles, requires zero external cloud billing, and uses standard SQL tables so migrating to PostgreSQL/Supabase later only swaps the database adapter.
  - *Alternatives Passed Over*: Firebase Auth defaults to Google Sign-In unless manually configured in Firebase Console and lacks built-in private document storage in the starter tier; Cloud SQL requires provisioning an external Postgres instance and Google OAuth setup.
- **AI Document Review Integration (`@google/genai`)**:
  - *Chosen Approach*: Server-side `/api/reviews/:id/ai-suggest` endpoint using `gemini-4-hydrogen`, gated behind an explicit user consent checkbox and strictly prompted never to fabricate qualifications or experience.
  - *Why*: Keeps `GEMINI_API_KEY` completely hidden on the server, works on the standard free-tier key, and degrades gracefully to pure human editor review if no key is present.

### External Services & Potential Costs

| Service / Capability | Recommended Approach | Cost Tier | Notes |
| :--- | :--- | :--- | :--- |
| **Application & API Hosting** | Express + Vite (`server.ts`) | Free / Existing Environment | Runs directly in the existing Node.js environment on port 3000. |
| **Relational Database** | Built-in Node.js SQLite (`node:sqlite`) | $0 (Free, Local File) | Zero external DB charges; upgrade path to Supabase/PostgreSQL when scaling. |
| **Private File Storage** | Server-side private directory + signed download tokens | $0 (Free, Local Disk) | Files stored outside static public directories; upgrade path to private S3/GCS bucket. |
| **Authentication & Sessions** | `node:crypto` (`scrypt`) + signed HTTP-only cookies | $0 (Free) | No per-MAU auth fees; handles Email/Password & RBAC natively. |
| **AI Writing Suggestions** | `@google/genai` (`gemini-4-hydrogen`) | Free Tier Available | Optional; falls back cleanly to human-only review if unconfigured. |
| **Email / SMS Notifications** | In-app notifications only for MVP | $0 (Free) | Avoids promising external email/SMS delivery until an SMTP/SMS provider is configured. |

### Phased Implementation Roadmap (And Recommended MVP Scope)

1. **Phase 1 — Project Setup & Ghana-Only Discovery Core**: Configure branding/theme tokens, initialize SQLite schema with Ghana's 16 regions, 20 categories, and clearly marked demo Ghana opportunities; enforce Ghana-only validation rules; build Home & Find Internships pages.
2. **Phase 2 — Region/Category Navigation, Search & Opportunity Details**: Complete filtering across all 16 regions, work arrangements, qualifications, sorting, filter reset, full Opportunity Detail view, and Report Listing modal.
3. **Phase 3 — Verification Engine & Administrator Dashboard**: Automatic deadline-to-Expired checks, Admin verification workflow (recording source URL, Ghana eligibility check, notes, and last-verified timestamp), opportunity CRUD, categories/regions management, and audit logs.
4. **Phase 4 — Authentication, Age Safeguards & Applicant Dashboard**: Registration/Login with Ghana Act 843 privacy & minor consent flow, Applicant profile preferences (industries & regions), saved/recently viewed opportunities, preparation checklist, and personalized recommendations.
5. **Phase 5 — Private Document Vault**: Authenticated PDF/DOCX uploads with server-side MIME/signature & size validation, private storage outside web root, short-lived signed download URLs, text preview, version tracking, and delete controls.
6. **Phase 6 — Document Review Workspace (Human + Optional Consented AI)**: Admin assignment of reviews to Editors, Editor queue restricted strictly to assigned documents, color-coded Red/Yellow/Green/Blue annotations, before/after comparison, 8-step review lifecycle, and optional consented Gemini suggestions.
7. **Phase 7 — In-App Notifications, Static Info Pages & Verification Testing**: Deadline/expiry/review-status notifications, About/Contact/Privacy/Terms pages, responsive mobile audit, and end-to-end verification of all 14 testing checklist items.

> [!NOTE]
> **Recommended MVP Scope**: Implement Phases 1 through 7 cleanly using the single Express + SQLite + React application so every core workflow (Ghana-only discovery, Admin verification, private PDF/DOCX uploads, and Editor document review) works end-to-end with real server enforcement and zero unfinished stub pages.

---

## 4. Technical Architecture, Database Schema, Roles & Security *(Technical Reference)*

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        BROWSER (React 19 + TypeScript + Tailwind v4)       │
│  ┌──────────────────┐  ┌────────────────────┐  ┌────────────────────────┐  │
│  │ Public Discovery │  │ Applicant Vault &  │  │ Editor & Admin         │  │
│  │ Home / Search /  │  │ Dashboard / Review │  │ Workspaces / Verify /  │  │
│  │ Detail / Regions │  │ Diff & Comments    │  │ Assignments / Logs     │  │
│  └────────┬─────────┘  └─────────┬──────────┘  └───────────┬────────────┘  │
└───────────┼──────────────────────┼─────────────────────────┼───────────────┘
            │ HTTPS + HTTP-Only Signed Session Cookie        │
            ▼                                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                      EXPRESS SERVER (server.ts — Port 3000)                │
│  ┌──────────────────────┐  ┌─────────────────────┐  ┌───────────────────┐  │
│  │ Auth & RBAC Guard    │  │ Opportunity &       │  │ Private Document  │  │
│  │ (Applicant / Editor  │  │ Ghana-Eligibility   │  │ Upload & Signed   │  │
│  │  / Admin Middleware) │  │ Verification Engine │  │ Token Downloader  │  │
│  └──────────┬───────────┘  └──────────┬──────────┘  └─────────┬─────────┘  │
│             │                         │                       │            │
│             ▼                         ▼                       ▼            │
│  ┌──────────────────────────────────────────┐     ┌─────────────────────┐  │
│  │   SQLite Relational DB (node:sqlite)     │     │ Private Disk Vault  │  │
│  │   14 Normalized Tables + Audit Logs      │     │ /storage/private/   │  │
│  └──────────────────────────────────────────┘     └─────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ Optional Server-Side AI Proxy (@google/genai — gemini-4-hydrogen)    │  │
│  │ Executed ONLY with explicit applicant consent; API key stays server  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

### Proposed Relational Database Schema

| Table | Key Columns & Relationships |
| :--- | :--- |
| `users` | `id`, `email` (unique), `password_hash`, `full_name`, `role` (`applicant`, `editor`, `admin`), `is_minor`, `guardian_consent_confirmed`, `privacy_consent_at`, `status`, `created_at` |
| `applicant_profiles` | `user_id` (FK -> `users`), `education_level`, `institution`, `graduation_year`, `preferred_regions` (JSON), `preferred_categories` (JSON), `skills` (JSON), `bio`, `updated_at` |
| `regions` | `id`, `name` (16 Ghana regions + Multi-Region), `slug`, `capital`, `is_active` |
| `opportunity_categories` | `id`, `name` (20 core Ghana industries), `slug`, `is_active`, `created_by` |
| `organizations` | `id`, `name`, `description`, `sector`, `ghana_presence_confirmed`, `website_url`, `primary_region_id` (FK -> `regions`) |
| `opportunities` | `id`, `title`, `organization_id` (FK), `category_id` (FK), `region_id` (FK), `city_district`, `work_arrangement` (`onsite`, `hybrid`, `remote_ghana`), `ghana_eligibility_confirmed`, `ghana_eligibility_evidence`, `description`, `responsibilities`, `qualifications`, `eligibility_requirements`, `required_skills`, `required_documents`, `opening_date`, `deadline`, `duration`, `compensation`, `official_apply_url`, `source_url`, `verification_status` (`Verified`, `Pending Verification`, `Closing Soon`, `Expired`, `Closed`, `Source Unavailable`), `last_verified_at`, `verified_by` (FK -> `users`), `is_demo`, `created_at` |
| `verification_logs` | `id`, `opportunity_id` (FK), `admin_id` (FK -> `users`), `previous_status`, `new_status`, `source_checked_url`, `ghana_confirmed`, `notes`, `checked_at` |
| `saved_opportunities` | `id`, `user_id` (FK), `opportunity_id` (FK), `created_at` (unique composite `(user_id, opportunity_id)`) |
| `documents` | `id`, `owner_id` (FK -> `users`), `title`, `doc_type` (`cv`, `cover_letter`, `motivation_letter`, `personal_statement`, `other`), `current_version_id`, `review_status` (8 statuses), `ai_consent_granted`, `retention_expires_at`, `created_at`, `updated_at` |
| `document_versions` | `id`, `document_id` (FK -> `documents`), `version_number`, `original_filename`, `mime_type`, `file_size`, `storage_key` (UUID on private disk), `extracted_text`, `uploaded_by` (FK -> `users`), `created_at` |
| `editor_assignments` | `id`, `document_id` (FK), `editor_id` (FK -> `users`), `assigned_by` (FK -> `users`), `due_at`, `is_active`, `assigned_at` |
| `document_reviews` | `id`, `document_id` (FK), `assignment_id` (FK), `editor_id` (FK), `base_version_id` (FK), `revised_text`, `annotations_json` (Red/Yellow/Green/Blue items), `ai_suggestions_json` (separately labeled), `editor_summary`, `status`, `updated_at` |
| `notifications` | `id`, `user_id` (FK), `type`, `title`, `message`, `link_path`, `is_read`, `created_at` |
| `opportunity_reports` | `id`, `opportunity_id` (FK), `reporter_id` (FK nullable), `reason`, `details`, `status` (`open`, `resolved`, `dismissed`), `created_at` |
| `audit_logs` | `id`, `actor_id` (FK nullable), `action`, `target_type`, `target_id`, `metadata_json`, `created_at` |

### User-Role & Permissions Matrix

| Capability | Public Visitor | Young Applicant | Document Editor | Administrator |
| :--- | :---: | :---: | :---: | :---: |
| Browse, search & filter verified Ghana internships | Yes | Yes | Yes | Yes |
| Report suspicious/expired opportunity | Yes | Yes | Yes | Yes |
| Save opportunities & manage personal profile | No | Yes | Yes | Yes |
| Upload/replace/delete own PDF & DOCX documents | No | Own Only | No | Metadata Only |
| Download private documents via signed URL | No | Own Only | Assigned Only | No (Privacy) |
| View & review assigned documents / add corrections | No | View & Approve Own | Assigned Only | Assign & Monitor |
| Request optional consented AI suggestions | No | Own Only | Assigned (if consented) | No |
| Add/edit/verify Ghana opportunities & categories | No | No | No | Yes |
| Manage users, create editors & assign reviews | No | No | No | Yes |
| View platform stats & security audit logs | No | No | No | Yes |

### Interactive Workflows & State Mapping
1. **Ghana-Only Verification & Active Feed Lifecycle**:
   - Creating or editing an opportunity validates `ghana_eligibility_confirmed = true`, a valid `region_id`, and a `source_url`. New listings start as `Pending Verification`.
   - Only an `admin` action updates `verification_status` to `Verified` and writes `last_verified_at` + a `verification_logs` entry.
   - **Active View Filtering & Automatic Expiry**: Public discovery endpoints (`GET /api/opportunities`) run a server-side deadline sweep (`UPDATE opportunities SET verification_status = 'Expired' WHERE deadline < date('now') AND verification_status IN ('Verified', 'Closing Soon')`) and return only active (`Verified` / `Closing Soon`) Ghana opportunities by default so expired listings immediately leave the active view.
   - **Official Portal Click**: Opening an opportunity renders its full verified details and distinct external `official_apply_url` button (validated to allow only `http://` or `https://` links).
2. **8-Step Document Review Workflow**:
   - Applicant uploads PDF/DOCX -> `Submitted` -> clicks *Request Review* -> `Awaiting Assignment` -> Admin assigns Editor -> `Assigned` -> Editor opens workspace -> `Under Review` -> Editor adds Red/Yellow/Green/Blue annotations & draft -> `Changes Suggested` / `Awaiting Applicant Approval` -> Applicant reviews side-by-side diff and accepts -> `Approved` -> Editor/Applicant closes -> `Completed`.
   - Every transition triggers an in-app notification and an `audit_logs` entry.

### Security, Privacy & Ghana Data Protection Act (Act 843) Considerations
- **Data Minimization, Scope Hygiene & Minor Safeguards**: Only collect name, email, education/career preferences, and application documents (explicitly prohibit Ghana Card / national ID numbers, bank details, or sensitive financial data, and **never collect or display voter, political, or campaign data**). Under-18 registrants see a plain-language privacy notice and guardian-awareness confirmation.
- **Private Document Protection**: Uploaded files are validated by extension, MIME type, magic bytes (`%PDF` / `PK` ZIP header for DOCX), and size limit (5 MB), stored with random UUID filenames outside public web directories, and never stored in `localStorage`. Downloads require an authenticated session, ownership/assignment authorization check, and a short-lived HMAC-signed token (60 seconds).
- **Legal Disclaimer**: The platform implements Act 843-aligned practices (purpose limitation, consent tracking, user deletion of documents & accounts, audit logging), while explicitly stating in the Privacy Policy that formal legal review is required before official organizational launch.
