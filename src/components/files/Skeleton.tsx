import React from 'react';
import LoginButton from '@/components/landing/LoginButton';
import Nav from '@/components/landing/Nav';
import { useAuth } from '@/contexts/AuthContext';

const Skeleton: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    let { user } = useAuth();

    return <div className="flex flex-1 w-full h-full bg-zinc-900 min-h-screen max-h-screen" >
        <div className="min-h-screen w-52 border-r border-r-zinc-700">
            <div className="text-sm text-zinc-400 p-5 mb-10">
                {user ? user.email : <LoginButton />}
            </div>
            <div className="w-40"><Nav /></div>
        </div>
        <div style={{}} className="flex flex-1  flex-col overflow-hidden">
            {children}
        </div>
    </div >;

};

export default Skeleton;
