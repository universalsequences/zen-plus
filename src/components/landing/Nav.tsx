import React, { useEffect } from 'react';
import { useNav, NavOption } from '@/contexts/NavContext';
import NavOptions from './NavOptions';

const Nav = () => {
    const { setNavOption } = useNav();
    return <div
        style={{
            backgroundColor: "#ffffff00",
            backdropFilter: "blur(8px)"
        }}
        className="fixed top-10 left-10 h-16 z-30 ">
        <div className="mx-auto table text-base">
            <NavOptions />
        </div>
    </div >
};

export default Nav;
