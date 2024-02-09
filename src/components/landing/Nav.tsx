import React, { useEffect } from 'react';
import { useNav, NavOption } from '@/contexts/NavContext';
import NavOptions from './NavOptions';

const Nav = () => {
    const { setNavOption } = useNav();
    return <div
        style={{
        }}
    >
        <div className="mx-auto table text-base">
            <NavOptions />
        </div>
    </div >
};

export default Nav;
