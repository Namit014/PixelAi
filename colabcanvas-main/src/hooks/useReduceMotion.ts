import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useReduceMotion = () => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Check system preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const systemPreference = mediaQuery.matches;
    
    if (systemPreference) {
      setReduceMotion(true);
      return;
    }

    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setReduceMotion(true);
      } else {
        loadUserPreference();
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    loadUserPreference();

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const loadUserPreference = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('profiles')
      .select('reduce_motion')
      .eq('id', session.user.id)
      .single();

    if (data) {
      setReduceMotion(data.reduce_motion || false);
    }
  };

  return reduceMotion;
};
