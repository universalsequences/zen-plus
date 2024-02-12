import React, { useState } from 'react';
import LandingDetails from './LandingDetails';
import ShaderLanding from './ShaderLanding';
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
        console.log('user navoption', user, navOption);
        if (user && navOption === NavOption.Home) {
            console.log('setting to files');
            setNavOption(NavOption.Files);
        }
    }, [setShowNav, user, navOption]);

    console.log("navOption=", navOption);
    return <div
        className={"overflow-scroll flex bg-black w-full h-full min-h-screen " + (false ? "light-mode" : "")}>

        {showNav && navOption === NavOption.Docs && <div className="absolute top-10 left-20 h-16 z-30 "><Nav /></div>
        }

        {
            navOption === NavOption.Home ? <>
                <div className="flex flex-col w-full min-h-screen overflow-y-scroll overflow-x-hidden max-h-screen relative">
                    {showNav && <div className="absolute top-10 left-20 h-16 z-30 "><Nav /></div>
                    }
                    <div style={{ minHeight: "100vh" }} className="flex flex-col w-full mt-5 patches justify-center relative h-full">
                        <div className="text-6xl text-center w-64 h-64 m-auto flex">
                            <span className="m-auto tracking-tight bg-zinc-400 p-5 rounded-3xl">
                                <img src="zendotdash.svg" />
                            </span>

                        </div>
                        <LoginButton />
                        <div className="absolute bottom-5 left-10 p-10 w-96 text-zinc-600">
                            <span className="text-white">zen+</span> is a visual programming environment for creating <span className="text-white">AV</span> works
                        </div>
                        <div className="absolute bottom-5 right-5 p-10 w-40  text-zinc-600">
                            based on the open-source <span className="text-white">zen</span> programming toolkit
                        </div>
                    </div>
                    <LandingDetails />
                </div>
            </> :
                navOption === NavOption.Docs ? < Documentation /> :
                    <Works setShowNav={setShowNav} />
        }
    </div >

};
