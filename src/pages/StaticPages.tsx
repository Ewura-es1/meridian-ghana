import React, { useState } from 'react';
import { apiFetch } from '../lib/api';

export function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0f294a]">
        About Meridian Youth Internship Registry
      </h1>
      <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
        Meridian Youth Internship Registry is designed to help young people across all 16 administrative regions of Ghana discover genuine, Ghana-eligible internships and prepare stronger application documents with confidential human feedback.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-2 sm:pt-4">
        <div className="p-5 sm:p-6 rounded-xl border border-slate-200 bg-[#f4f6f9] space-y-2">
          <h2 className="font-display text-lg font-bold text-[#0f294a]">Ghana-Only Eligibility Standard</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Every active listing must either take place physically in Ghana, be hosted by an organization operating in Ghana for Ghana residents, or explicitly confirm remote participation from Ghana.
          </p>
        </div>
        <div className="p-5 sm:p-6 rounded-xl border border-slate-200 bg-[#f4f6f9] space-y-2">
          <h2 className="font-display text-lg font-bold text-[#0f294a]">Source Verification & Expiry</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Listings are never marked verified merely upon entry. Administrators check source URLs, record verification dates, and expired deadlines automatically leave active public views.
          </p>
        </div>
      </div>
      <p className="text-xs text-slate-500 pt-4 border-t border-slate-200">
        Institutional notice: Meridian Youth Internship Registry uses configurable placeholder branding until official client brand assets are supplied. No government affiliation or official partner endorsement is claimed.
      </p>
    </div>
  );
}

export function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/api/contact', {
        method: 'POST',
        body: JSON.stringify({ name, email, subject, message }),
      });
      setSent(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setError(err.message || 'Unable to send message.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0f294a]">
          Contact & Opportunity Submissions
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Submit questions, report a broken internship link, or suggest a verified Ghana-based organization for administrator review.
        </p>
      </div>

      {sent ? (
        <div className="p-6 rounded-xl bg-[#f0fdfa] border border-teal-200 text-sm text-[#0f766e]">
          Thank you. Your message has been recorded for the registry support team.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 text-base sm:text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 text-base sm:text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 text-base sm:text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Message</label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3.5 py-2.5 text-base sm:text-sm border border-slate-300 rounded-lg"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 text-sm font-semibold text-white bg-[#0f294a] hover:bg-[#173a66] rounded-lg"
          >
            Send Message
          </button>
        </form>
      )}
    </div>
  );
}

export function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0f294a]">
        Privacy Policy & Data Protection Notice
      </h1>
      <p className="text-sm text-slate-600">
        Designed with reference to Ghana&apos;s Data Protection Act, 2012 (Act 843) principles. Formal legal review should be completed by the operating organization before official public launch.
      </p>

      <div className="space-y-5 text-sm text-slate-700 leading-relaxed">
        <section className="space-y-1.5">
          <h2 className="font-display text-lg font-bold text-[#0f294a]">1. Data Minimization</h2>
          <p>
            We collect only your name, email address, educational preferences, and application documents (CVs, cover letters, motivation letters). We do not request national identification numbers (such as Ghana Card), bank details, or voter/campaign information.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="font-display text-lg font-bold text-[#0f294a]">2. Private Document Handling</h2>
          <p>
            Uploaded PDF and DOCX files are stored privately on the server outside public URLs and accessed only via short-lived signed download tokens by the document owner or a human editor explicitly assigned to review that document.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="font-display text-lg font-bold text-[#0f294a]">3. Safeguards for Young People & Minors</h2>
          <p>
            Applicants under 18 years of age are presented with clear age-appropriate notices and must confirm parent or legal guardian awareness before creating an account.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="font-display text-lg font-bold text-[#0f294a]">4. Consent for Optional AI Proofreading</h2>
          <p>
            Document drafts are never sent to external AI services automatically. Applicants must grant explicit consent per document, and AI output is strictly advisory.
          </p>
        </section>

        <section className="space-y-1.5">
          <h2 className="font-display text-lg font-bold text-[#0f294a]">5. Retention & Deletion Rights</h2>
          <p>
            Applicants may delete individual uploaded documents or delete their entire account and associated server files at any time from their Dashboard.
          </p>
        </section>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0f294a]">Terms and Conditions</h1>
      <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>
          Meridian Youth Internship Registry connects young applicants in Ghana with verified internship listings and document preparation tools. Official applications are completed directly on each hosting organization&apos;s external portal.
        </p>
        <p>
          Document review feedback—whether from authorized human reviewers or consented AI proofreading—is advisory. Applicants remain responsible for the factual accuracy of their CVs, cover letters, and submitted applications.
        </p>
        <p>
          Any listing marked [DEMO] is demonstration content used to illustrate platform functionality and does not represent an active commercial or government vacancy.
        </p>
      </div>
    </div>
  );
}
