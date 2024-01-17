import React from 'react';
import Documentation from '@/components/docs/Documentation';
import Nav from './Nav';
import { useAuth } from '@/contexts/AuthContext';
import { useNav, NavOption } from '@/contexts/NavContext';

export const Landing = () => {
    const { navOption } = useNav();
    const { googleSignIn } = useAuth();
    return <div
        className={"flex bg-black w-full h-full min-h-screen " + (false ? "light-mode" : "")}>
        <Nav />

        {navOption === NavOption.Home ? <>
            <div className="flex flex-col w-full mt-5 patches justify-center">
                <div className="text-6xl text-center w-64 h-64 m-auto flex">
                    <span className="m-auto tracking-tight">
                        zen+
                    </span>

                </div>
                <button onClick={googleSignIn} className="text-zinc-500 cursor-pointer relative px-6 py-1 bg-zinc-300 border rounded-full m-auto flex">
                    <div className="blur-2xl opacity-20 bg-white w-32 h-32 absolute -top-11 -left-4 rounded-full">
                    </div>
                    sign in
                </button>
                <div className="fixed bottom-0 left-0 p-10 w-96 text-zinc-600">
                    <span className="text-white">zen+</span> is a programming environment for creating <span className="text-white">audiovisual</span> works
                </div>
                <div className="fixed bottom-0 right-0 p-10 w-40  text-zinc-600">
                    based on the open-source <span className="text-white">zen</span> programming toolkit
                </div>
            </div>
        </> :
            <Documentation />
        }
    </div >

};
