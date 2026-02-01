'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [impersonatedWeddingId, setImpersonatedWeddingId] = useState(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Load impersonation state from storage on mount
        const storedId = localStorage.getItem('impersonatedWeddingId');
        if (storedId) setImpersonatedWeddingId(storedId);

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setLoading(true);
            if (currentUser) {
                setUser(currentUser);
                try {
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists()) {
                        setUserData(userDoc.data());
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            } else {
                setUser(null);
                setUserData(null);
                setImpersonatedWeddingId(null);
                localStorage.removeItem('impersonatedWeddingId');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Helper to start impersonation
    const impersonateWedding = (weddingId) => {
        setImpersonatedWeddingId(weddingId);
        localStorage.setItem('impersonatedWeddingId', weddingId);
        router.push('/dashboard');
    };

    // Helper to stop impersonation
    const stopImpersonation = () => {
        setImpersonatedWeddingId(null);
        localStorage.removeItem('impersonatedWeddingId');
        router.push('/admin');
    };

    // Derived User Data with Override
    const finalUserData = userData ? {
        ...userData,
        weddingId: (userData.role === 'admin' && impersonatedWeddingId) ? impersonatedWeddingId : userData.weddingId,
        isImpersonating: !!(userData.role === 'admin' && impersonatedWeddingId)
    } : null;

    return (
        <AuthContext.Provider value={{
            user,
            userData: finalUserData,
            loading,
            impersonateWedding,
            stopImpersonation
        }}>
            {children}
        </AuthContext.Provider>
    );
};
