import React from 'react';
import { API } from '@/lib/docs/docs';
const APIComponent: React.FC<{ api: API }> = ({ api }) => {
    return <div>
        {Object.keys(api).sort().map(
            (key, i) =>
                <div key={i} className="flex p-2 flex-col">
                    <div className="flex">
                        <div className="w-40 font-bold text-white">{key}</div>
                        <div className="ml-5 text-zinc-400 flex flex-col flex-1">
                            <div className="">
                                {api[key].description}
                            </div>
                            <div className="flex flex-col text-zinc-600">
                                {api[key] && api[key].inletNames ? api[key].inletNames!.map((x: string, i) => <span key={i}>Inlet {i + 1}: {x}</span>) : ""}
                            </div>
                            <div className="flex flex-col text-zinc-600">
                                {api[key] && api[key].outletNames ? api[key].outletNames!.map((x: string, i) => <span key={i}>Outlet {i + 1}: {x}</span>) : ""}
                            </div></div>
                    </div>
                </div>
        )}


    </div >;
};

export default APIComponent;
