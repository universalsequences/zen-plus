import React, { useEffect, memo, useCallback, useRef } from 'react';
import { Cross2Icon, MagnifyingGlassIcon } from '@radix-ui/react-icons';

const SearchBox: React.FC<{ searchText: string, setSearchText: (x: string) => void }> = ({ searchText, setSearchText }) => {
    let ref = useRef<HTMLInputElement>(null);
    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        setSearchText(e.target.value);
        if (ref.current) {
        }
    }, [setSearchText]);

    useEffect(() => {
        setTimeout(() => {
            if (ref.current) {
                ref.current.focus();
            }
        }, 10);
    }, [searchText]);

    return <div className="relative w-full">
        <input ref={ref} value={searchText} onChange={onChange} type="text" className="w-full pl-8 py-1.5 outline-none" />
        <MagnifyingGlassIcon className="absolute z-30 top-2 left-2 w-4 h-4" />
        <Cross2Icon onClick={() => setSearchText("")} className="absolute z-30 top-2 right-2 w-4 h-4 cursor-pointer" />
    </div>

};

export default SearchBox;
