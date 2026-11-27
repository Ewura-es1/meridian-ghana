export type UserRole = 'applicant' | 'editor' | 'admin';

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_minor: number;
  is_demo: number;
}

export interface ApplicantProfile {
  education_level: string;
  institution: string;
  graduation_year: string;
  preferred_regions: string[];
  preferred_categories: string[];
  skills: string[];
  bio: string;
  notify_deadlines: boolean;
  notify_reviews: boolean;
}

export interface GhanaRegion {
  id: number;
  name: string;
  slug: string;
  capital: string;
  is_multi_region: number;
  active_count: number;
}

export interface OpportunityCategory {
  id: number;
  name: string;
  slug: string;
  active_count: number;
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  created_at: string;
}

export type VerificationStatus =
  | 'Verified'
  | 'Pending Verification'
  | 'Closing Soon'
  | 'Expired'
  | 'Closed'
  | 'Source Unavailable';

export interface Opportunity {
  id: number;
  title: string;
  organization_id: number;
  organization_name: string;
  organization_description: string;
  organization_website?: string;
  category_id: number;
  category_name: string;
  category_slug: string;
  region_id: number;
  region_name: string;
  region_slug: string;
  region_capital?: string;
  city_district: string;
  location_summary: string;
  work_arrangement: 'On-site' | 'Hybrid' | 'Remote (Ghana Residents)';
  ghana_eligibility_confirmed: number;
  ghana_eligibility_evidence: string;
  description: string;
  responsibilities: string;
  qualifications: string;
  eligibility_requirements: string;
  required_skills?: string;
  required_documents?: string;
  opening_date: string | null;
  deadline: string;
  duration: string;
  compensation: string;
  official_apply_url: string;
  source_url: string;
  verification_status: VerificationStatus;
  last_verified_at: string | null;
  verification_notes?: string;
  is_demo: number;
  created_at: string;
  isSaved?: boolean;
}

export interface VerificationLog {
  id: number;
  previous_status: string;
  new_status: string;
  source_checked_url: string;
  ghana_confirmed: number;
  notes: string;
  checked_at: string;
}

export type ReviewStatus =
  | 'Submitted'
  | 'Awaiting Assignment'
  | 'Assigned'
  | 'Under Review'
  | 'Changes Suggested'
  | 'Awaiting Applicant Approval'
  | 'Approved'
  | 'Completed';

export interface DocumentItem {
  id: number;
  owner_id: number;
  title: string;
  doc_type: 'cv' | 'cover_letter' | 'motivation_letter' | 'personal_statement' | 'other';
  current_version_id: number;
  review_status: ReviewStatus;
  ai_consent_granted: number;
  retention_expires_at: string;
  created_at: string;
  updated_at: string;
  version_number?: number;
  original_filename?: string;
  file_size?: number;
  assigned_editor_name?: string | null;
}

export interface DocumentVersion {
  id: number;
  document_id: number;
  version_number: number;
  original_filename: string;
  mime_type: string;
  file_size: number;
  extracted_text: string;
  created_at: string;
}

export interface ReviewAnnotation {
  id: string;
  color: 'red' | 'yellow' | 'green' | 'blue';
  label: string;
  section: string;
  excerpt: string;
  comment: string;
  status: 'open' | 'accepted' | 'rejected';
}

export interface AiSuggestion {
  id: string;
  category: 'error' | 'improvement' | 'clarity';
  section: string;
  originalExcerpt: string;
  suggestion: string;
  explanation: string;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  link_path: string;
  is_read: number;
  created_at: string;
}
