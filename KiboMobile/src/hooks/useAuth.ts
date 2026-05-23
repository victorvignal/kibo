import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { onAuthChange } from '../services/firebase';

/**
 * Clean hook for auth state management.
 * Returns the current Firebase user and a loading state.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}
