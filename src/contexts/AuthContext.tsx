import { createContext, useEffect, useState, useContext } from "react";
import { signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/db/firebase";
import { useRouter } from "next/router";

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
