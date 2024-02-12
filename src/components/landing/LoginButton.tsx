import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

const LoginButton = () => {
    const { user, googleSignIn } = useAuth();
    return (
        <button onClick={googleSignIn} className="text-zinc-500 cursor-pointer relative px-6 py-1 bg-zinc-300 border rounded-full m-auto flex md:visible invisible">
            <div className="blur-2xl opacity-20 bg-white w-32 h-32 absolute -top-11 -left-4 rounded-full">
            </div>
            sign in
        </button>
    );
};

export default LoginButton;
