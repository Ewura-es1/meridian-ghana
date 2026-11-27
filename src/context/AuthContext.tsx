import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, getMemoryAuthToken, setMemoryAuthToken } from '../lib/api';
import type { Announcement, ApplicantProfile, AuthUser, GhanaRegion, OpportunityCategory } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  profile: ApplicantProfile | null;
  unreadNotifications: number;
  authStatus: { hasAdmin: boolean; envAdminPasscodeSet: boolean; aiConfigured: boolean };
  regions: GhanaRegion[];
  categories: OpportunityCategory[];
  announcements: Announcement[];
  loadingMeta: boolean;
  setSession: (token: string, user: AuthUser) => Promise<void>;
  refreshMe: () => Promise<void>;
  refreshMeta: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [authStatus, setAuthStatus] = useState({
    hasAdmin: false,
    envAdminPasscodeSet: false,
    aiConfigured: false,
  });
  const [regions, setRegions] = useState<GhanaRegion[]>([]);
  const [categories, setCategories] = useState<OpportunityCategory[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const refreshMeta = useCallback(async () => {
    try {
      const [meta, status] = await Promise.all([
        apiFetch<{ regions: GhanaRegion[]; categories: OpportunityCategory[]; announcements: Announcement[] }>(
          '/api/opportunities/meta'
        ),
        apiFetch<{ hasAdmin: boolean; envAdminPasscodeSet: boolean; aiConfigured: boolean }>('/api/auth/status'),
      ]);
      setRegions(meta.regions);
      setCategories(meta.categories);
      setAnnouncements(meta.announcements);
      setAuthStatus(status);
    } catch (err) {
      console.error('Failed to load platform metadata:', err);
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    if (!getMemoryAuthToken()) {
      setUser(null);
      setProfile(null);
      setUnreadNotifications(0);
      return;
    }
    try {
      const data = await apiFetch<{
        user: AuthUser;
        profile: ApplicantProfile | null;
        unreadNotifications: number;
      }>('/api/auth/me');
      setUser(data.user);
      setProfile(data.profile);
      setUnreadNotifications(data.unreadNotifications);
    } catch {
      setMemoryAuthToken(null);
      setUser(null);
      setProfile(null);
      setUnreadNotifications(0);
    }
  }, []);

  const setSession = useCallback(
    async (token: string, nextUser: AuthUser) => {
      setMemoryAuthToken(token);
      setUser(nextUser);
      await refreshMe();
      await refreshMeta();
    },
    [refreshMe, refreshMeta]
  );

  const logout = useCallback(async () => {
    try {
      if (getMemoryAuthToken()) {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      }
    } catch {
      // ignore logout transport error
    }
    setMemoryAuthToken(null);
    setUser(null);
    setProfile(null);
    setUnreadNotifications(0);
  }, []);

  useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        unreadNotifications,
        authStatus,
        regions,
        categories,
        announcements,
        loadingMeta,
        setSession,
        refreshMe,
        refreshMeta,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
