import { createContext, useEffect, useState, useContext } from "react";
import { auth } from "@/lib/db/firebase";
import { useRouter } from "next/router";
import { 
  signInWithPopup as firebaseSignInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged, 
  GoogleAuthProvider as FirebaseGoogleAuthProvider 
} from "firebase/auth";

// Check if we're in a test environment
const isBunTest = process.env.BUN_ENV === 'test' || Boolean(process.env.BUN);

// Create functions that will work with our auth object (real or mock)
const signInWithPopup = async (auth: any, provider: any) => {
  if (isBunTest) {
    return Promise.resolve({ user: null });
  }
  return firebaseSignInWithPopup(auth, provider);
};

const signOut = async (auth: any) => {
  if (isBunTest) {
    return Promise.resolve();
  }
  return firebaseSignOut(auth);
};

const onAuthStateChanged = (auth: any, callback: any) => {
  if (isBunTest) {
    callback(null);
    return () => {};
  }
  return firebaseOnAuthStateChanged(auth, callback);
};

// Use different implementation based on environment
const GoogleAuthProvider = isBunTest
  ? class {
      setCustomParameters(params: any) {
        return this;
      }
    }
  : FirebaseGoogleAuthProvider;

interface IAuthContext {
  user: any;
  googleSignIn: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<IAuthContext | undefined>(undefined);

export const useAuth = (): IAuthContext => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useMessageHandler must be used within MessageProvider");
  return context;
};

interface Props {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<Props> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const router = useRouter();

  const googleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ display: "popup" });
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google Sign-In Error", error);
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
      if (!currentUser) {
        if (router.pathname === "/") {
          setUser(currentUser);
        } else {
          router.replace("/");
        }
      } else {
        if (router.pathname === "/") {
          window.location.href = "/files"; // Full page reload
        } else {
          setUser(currentUser);
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, googleSignIn, logout }}>{children}</AuthContext.Provider>
  );
};
