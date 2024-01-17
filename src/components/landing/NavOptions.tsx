import React from 'react';
import { useNav, NavOption } from '@/contexts/NavContext';

const NavOptions = () => {
    return (
        <div className="flex flex-col">
            {<Option name="Home" option={NavOption.Home} />}
            <Option name="Docs" option={NavOption.Docs} />
            <Option name="Works" option={NavOption.Works} />
        </div>
    );
};

const Option: React.FC<{ option: NavOption, name: string }> = ({ name, option }) => {
    const { setNavOption, navOption } = useNav();
    return (<div
        onClick={() => setNavOption(option)}
        className={(navOption === option ? "text-zinc-100" : "text-zinc-700") + " mr-10 cursor-pointer"}>{name}</div>);
};

export default NavOptions;

