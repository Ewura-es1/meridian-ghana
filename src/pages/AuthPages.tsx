import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Shield, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import type { AuthUser } from '../types';

export function LoginPage() {
  const { setSession, authStatus } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // First-run Administrator setup state
  const [showAdminSetup, setShowAdminSetup] = useState(false);
  const [adminName, setAdminName] = useState('Registry Administrator');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');

  const routeAfterLogin = (role: AuthUser['role']) => {
    if (role === 'admin') navigate('/admin');
    else if (role === 'editor') navigate('/editor');
    else navigate('/dashboard');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await setSession(data.token, data.user);
      routeAfterLogin(data.user.role);
    } catch (err: any) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (role: 'applicant' | 'editor') => {
    setError('');
    setSubmitting(true);
    try {
      const data = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/demo-login', {
        method: 'POST',
        body: JSON.stringify({ role }),
      });
      await setSession(data.token, data.user);
      routeAfterLogin(data.user.role);
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/admin-claim', {
        method: 'POST',
        body: JSON.stringify({
          fullName: adminName,
          email: adminEmail,
          password: adminPassword,
          passcode: adminPasscode,
        }),
      });
      await setSession(data.token, data.user);
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Unable to set up administrator account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0f294a]">Sign In to Meridian Ghana</h1>
          <p className="text-sm text-slate-600 mt-1">
            Access your saved Ghana internships, private document vault, or reviewer workspace.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[44px] py-2.5 px-4 text-sm font-semibold text-white bg-[#0f294a] hover:bg-[#173a66] rounded-lg transition-colors"
          >
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-xs text-slate-600 pt-2 border-t border-slate-100">
          New young applicant in Ghana?{' '}
          <Link to="/register" className="text-[#0d9488] font-semibold hover:underline inline-flex items-center min-h-[36px]">
            Create an applicant account
          </Link>
        </p>
      </div>

      {/* Right column: Demo Roles + First-Run Admin Claim */}
      <div className="lg:col-span-5 space-y-5">
        <div className="bg-[#f4f6f9] border border-slate-200 rounded-xl p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#0f294a]">
            <UserCheck className="w-4 h-4 text-[#0d9488] shrink-0" aria-hidden="true" />
            Demonstration Accounts
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Explore the applicant vault or human editor review workspace using clearly marked sample accounts containing non-sensitive demo documents.
          </p>
          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleDemoLogin('applicant')}
              className="w-full min-h-[44px] py-2.5 px-3.5 text-xs font-semibold text-[#0f294a] bg-white border border-slate-300 hover:border-[#0d9488] rounded-lg transition-colors text-left"
            >
              Continue as Demo Applicant (Kwame Mensah)
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleDemoLogin('editor')}
              className="w-full min-h-[44px] py-2.5 px-3.5 text-xs font-semibold text-[#0f294a] bg-white border border-slate-300 hover:border-[#0d9488] rounded-lg transition-colors text-left"
            >
              Continue as Demo Document Editor (Abena Boateng)
            </button>
          </div>
        </div>

        {(!authStatus.hasAdmin || authStatus.envAdminPasscodeSet) && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0f294a]">
                <Shield className="w-4 h-4 text-[#0d9488] shrink-0" aria-hidden="true" />
                {authStatus.hasAdmin ? 'Administrator Access' : 'First-Run Admin Setup'}
              </div>
              <button
                type="button"
                onClick={() => setShowAdminSetup((v) => !v)}
                className="min-h-[40px] px-2 text-xs font-medium text-[#0d9488] hover:underline"
              >
                {showAdminSetup ? 'Hide' : 'Configure'}
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {authStatus.hasAdmin
                ? 'Administrator passcode configured via environment secret.'
                : 'No administrator account has been claimed yet. Set up the initial administrator credentials to verify opportunities and assign editors.'}
            </p>

            {showAdminSetup && (
              <form onSubmit={handleAdminClaim} className="space-y-3 pt-2 border-t border-slate-100">
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="Administrator full name"
                  className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs border border-slate-300 rounded-lg"
                />
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@organisation.gh"
                  className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs border border-slate-300 rounded-lg"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Choose password (min 8 chars)"
                  className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs border border-slate-300 rounded-lg"
                />
                {authStatus.envAdminPasscodeSet && (
                  <input
                    type="password"
                    required
                    value={adminPasscode}
                    onChange={(e) => setAdminPasscode(e.target.value)}
                    placeholder="ADMIN_PASSCODE secret"
                    className="w-full min-h-[44px] px-3 py-2 text-base sm:text-xs border border-slate-300 rounded-lg"
                  />
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[44px] py-2 text-xs font-semibold text-white bg-[#0d9488] hover:bg-[#0f766e] rounded-lg inline-flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                  Claim Administrator Account
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { setSession } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isMinor, setIsMinor] = useState(false);
  const [guardianConsentConfirmed, setGuardianConsentConfirmed] = useState(false);
  const [privacyConsentAccepted, setPrivacyConsentAccepted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await apiFetch<{ token: string; user: AuthUser }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          email,
          password,
          isMinor,
          guardianConsentConfirmed,
          privacyConsentAccepted,
        }),
      });
      await setSession(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0f294a]">
            Create Young Applicant Account
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            We collect only the details required to match you with Ghana-based internships and support your application documents. Do not enter national ID numbers (such as Ghana Card) or financial details.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Ama Darko"
              className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ama@example.com"
              className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm border border-slate-300 rounded-lg"
            />
          </div>

          <div className="p-4 rounded-lg bg-[#f4f6f9] border border-slate-200 space-y-3 text-xs text-slate-700">
            <label className="flex items-start gap-3 py-1 cursor-pointer">
              <input
                type="checkbox"
                checked={isMinor}
                onChange={(e) => setIsMinor(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 shrink-0"
              />
              <span>I am under 18 years of age.</span>
            </label>

            {isMinor && (
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded bg-white border border-amber-200 text-amber-900">
                <input
                  type="checkbox"
                  checked={guardianConsentConfirmed}
                  onChange={(e) => setGuardianConsentConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 shrink-0"
                />
                <span>
                  I confirm that a parent or legal guardian is aware of my registration and document uploads on Meridian Youth Internship Registry.
                </span>
              </label>
            )}

            <label className="flex items-start gap-3 py-1 cursor-pointer">
              <input
                type="checkbox"
                checked={privacyConsentAccepted}
                onChange={(e) => setPrivacyConsentAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 shrink-0"
              />
              <span>
                I have read the{' '}
                <Link to="/privacy" className="text-[#0d9488] underline">
                  Privacy Policy (Data Protection Act, 2012 — Act 843 notice)
                </Link>{' '}
                and consent to private handling of my profile and application documents.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[44px] py-2.5 px-4 text-sm font-semibold text-white bg-[#0f294a] hover:bg-[#173a66] rounded-lg transition-colors"
          >
            {submitting ? 'Creating account...' : 'Create Applicant Account'}
          </button>
        </form>

        <p className="text-xs text-slate-600 pt-2 border-t border-slate-100">
          Already registered?{' '}
          <Link to="/login" className="text-[#0d9488] font-semibold hover:underline inline-flex items-center min-h-[36px]">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
