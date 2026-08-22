import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { BrandLoader } from '@/components/ui/BrandLoader';

interface AuthContextType {
  user: User | null;
  session: any | null;
  shouldShowAdminUI: boolean;
  onboardingCompleted: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  shouldShowAdminUI: false,
  onboardingCompleted: false,
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

// Cache keys for sessionStorage
const ADMIN_STATUS_KEY = 'admin_status';
const ADMIN_STATUS_TIMESTAMP_KEY = 'admin_status_timestamp';
const ONBOARDING_STATUS_KEY = 'onboarding_status';
const ONBOARDING_STATUS_TIMESTAMP_KEY = 'onboarding_status_timestamp';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Supabase localStorage key
const SUPABASE_AUTH_KEY = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`;

/**
 * Synchronously read the Supabase session from localStorage.
 * Returns session + user if a non-expired token exists, otherwise null.
 */
function getLocalSession(): { session: any; user: User } | null {
  try {
    const raw = localStorage.getItem(SUPABASE_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.access_token || !parsed?.user) return null;

    // Check expiry — expires_at is epoch seconds
    // Add 120s buffer: if token expires within 2 minutes, treat as expired
    // so onAuthStateChange can refresh it before any API calls happen
    if (parsed.expires_at && (parsed.expires_at * 1000) < (Date.now() + 120_000)) {
      return null; // expired or about to expire
    }

    return { session: parsed, user: parsed.user as User };
  } catch {
    return null;
  }
}

function getCachedStatus(key: string, tsKey: string): boolean | null {
  try {
    const val = sessionStorage.getItem(key);
    const ts = sessionStorage.getItem(tsKey);
    if (val && ts) {
      if (Date.now() - parseInt(ts, 10) < CACHE_TTL) {
        return val === 'true';
      }
    }
  } catch {}
  return null;
}

function setCachedStatus(key: string, tsKey: string, value: boolean) {
  try {
    sessionStorage.setItem(key, value ? 'true' : 'false');
    sessionStorage.setItem(tsKey, Date.now().toString());
  } catch {}
}

function clearCache(key: string, tsKey: string) {
  try {
    sessionStorage.removeItem(key);
    sessionStorage.removeItem(tsKey);
  } catch {}
}

function getInitialAuthState() {
  // BYPASS AUTH: Always return a dummy user and completed onboarding
  const dummyUser = { id: 'local-dev-bypass', email: 'bypass@colab.com', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '' } as any;
  const dummySession = { access_token: 'dummy-token', user: dummyUser };
  
  return { 
    user: dummyUser, 
    session: dummySession, 
    shouldShowAdminUI: true, 
    onboardingCompleted: true, 
    isLoading: false 
  };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initial = getInitialAuthState();

  const [user, setUser] = useState<User | null>(initial.user);
  const [session, setSession] = useState<any | null>(initial.session);
  const [shouldShowAdminUI, setShouldShowAdminUI] = useState(initial.shouldShowAdminUI);
  const [onboardingCompleted, setOnboardingCompleted] = useState(initial.onboardingCompleted);
  const [isLoading, setIsLoading] = useState(initial.isLoading);

  useEffect(() => {
    // BYPASS AUTH: Do nothing, keep the dummy state.
    return () => {};
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <BrandLoader size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, session, shouldShowAdminUI, onboardingCompleted, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
