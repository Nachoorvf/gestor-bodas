'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, onSnapshot } from 'firebase/firestore';
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
            let userUnsub;
            if (currentUser) {
                setUser(currentUser);
                try {
                    userUnsub = onSnapshot(doc(db, 'users', currentUser.uid), async (userDoc) => {
                        if (userDoc.exists()) {
                            const data = userDoc.data();
                            if (data.status === 'suspended') {
                                await signOut(auth);
                                setUser(null);
                                setUserData(null);
                                alert('Su cuenta ha sido suspendida. Contacte con soporte.');
                                router.push('/login');
                            } else {
                                setUserData(data);
                            }
                        } else {
                            // The user document was deleted (e.g. by admin deleting the wedding)
                            // We must log them out locally to avoid ghost sessions
                            await signOut(auth);
                            setUser(null);
                            setUserData(null);
                            router.push('/login');
                        }
                    });
                } catch (error) {
                    console.error("Error setting up user listener:", error);
                }
            } else {
                setUser(null);
                setUserData(null);
                setImpersonatedWeddingId(null);
                localStorage.removeItem('impersonatedWeddingId');
            }
            setLoading(false);
            
            return () => {
                if (userUnsub) userUnsub();
            };
        });

        return () => unsubscribe();
    }, []);

    // Helper to start impersonation
    const impersonateWedding = async (weddingId) => {
        setImpersonatedWeddingId(weddingId);
        localStorage.setItem('impersonatedWeddingId', weddingId);
        
        // Audit log
        if (user && userData?.role === 'admin') {
            try {
                await addDoc(collection(db, 'audit_logs'), {
                    action: 'IMPERSONATE_WEDDING',
                    adminId: user.uid,
                    adminEmail: user.email,
                    targetWeddingId: weddingId,
                    timestamp: new Date().toISOString()
                });
            } catch (e) {
                console.error("Audit log failed, but impersonation will proceed:", e);
            }
        }
        
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
