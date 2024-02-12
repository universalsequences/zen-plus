import { createContext, useEffect, useCallback, useState, useContext } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/db/firebase';

interface IAuthContext {
    user: any;
    googleSignIn: () => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<IAuthContext | undefined>(undefined);

export const useAuth = (): IAuthContext => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useMessageHandler must be used within MessageProvider');
    return context;
};

interface Props {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<Props> = ({ children }) => {
    const [user, setUser] = useState<any | null>(null);

    const googleSignIn = () => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider);
    };

    const logout = () => {
        console.log('signing out!');
        return signOut(auth);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, [setUser]);

    return <AuthContext.Provider
        value={
            { user, googleSignIn, logout }
        }>
        {children}
    </AuthContext.Provider>
};


