import React, { useState } from 'react';
import LoginButton from './LoginButton';
import Works from '@/components/works/Works';
import Documentation from '@/components/docs/Documentation';
import Nav from './Nav';
import { useAuth } from '@/contexts/AuthContext';
import { useNav, NavOption } from '@/contexts/NavContext';

export const Landing = () => {
    const { navOption, setNavOption } = useNav();
    const { user, googleSignIn } = useAuth();
    const [showNav, setShowNav] = useState(true);

    React.useEffect(() => {
        if (user && navOption === NavOption.Home) {
            console.log('setting to files');
            setNavOption(NavOption.Files);
        }
    }, [setShowNav, user, navOption]);

    return <div
        className={"flex bg-black w-full h-full min-h-screen " + (false ? "light-mode" : "")}>
        {showNav && navOption !== NavOption.Works && <div className="fixed top-10 left-10 h-16 z-30 "><Nav /></div>
        }


        {
            navOption === NavOption.Home ? <>
                <div className="flex flex-col w-full mt-5 patches justify-center">
                    <div className="text-6xl text-center w-64 h-64 m-auto flex">
                        <span className="m-auto tracking-tight">
                            zen+
                        </span>

                    </div>
                    <LoginButton />
                    <div className="fixed bottom-0 left-0 p-10 w-96 text-zinc-600">
                        <span className="text-white">zen+</span> is a programming environment for creating <span className="text-white">audiovisual</span> works
                    </div>
                    <div className="fixed bottom-0 right-0 p-10 w-40  text-zinc-600">
                        based on the open-source <span className="text-white">zen</span> programming toolkit
                    </div>
                </div>
            </> :
                navOption === NavOption.Docs ? < Documentation /> :
                    <Works setShowNav={setShowNav} />
        }
    </div >

};
