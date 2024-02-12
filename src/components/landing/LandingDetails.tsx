import React, { useEffect, useCallback, useState } from 'react';

const LandingDetails: React.FC<{ scrollTop: number, height: number, scrollRef: React.MutableRefObject<HTMLDivElement | null> }> = ({ scrollRef, scrollTop, height }) => {

    let ratio = Math.min(1, Math.pow(scrollTop / height, .5));
    let ratio4 = Math.min(1, Math.pow(scrollTop / height, .25));
    let ratio3 = Math.min(1, Math.pow(scrollTop / height, 2));
    let ratio2 = Math.min(1, Math.pow((scrollTop - 0.8 * height) / (0.8 * height), .5));

    return (
        <div>
            <div
                style={{ top: scrollTop < height ? height + 20 : 0 }} //scrollTop < height: height(height + 20) - Math.min(height + 20, scrollTop) }}
                className={(scrollTop < height ? "absolute" : "fixed") + " h-full min-h-screen w-10 md:w-16 border-r border-r-zinc-700 bg-black z-30 flex flex-col"}>
                <img src="dotdash7.svg" className="absolute top-0 h-16 mx-auto mt-5 left-0 right-0" />
                <div style={{ transform: "rotate(-90deg) translate(0px,0px)" }} className="my-auto ">
                    zen+
                </div>
                <img src="dotdash7.svg" className="h-16 absolute bottom-0 left-0 right-0 mx-auto mt-auto mb-5" />
            </div>

            <Detail opacity={ratio4} header="PATCHING HEAVEN" textClassName="text-zen-violet" isMax={true}>
                <div
                    className="flex md:flex-row flex-col content-start object-fit items-start mb-20">
                    <div className="mr-0 md:mr-40">
                        <div className="text-3xl w-80">
                            A sandbox for <span className="text-white">audio visual</span> exploration.
                        </div>
                        <div className="text-xl  w-96 mt-10">
                            <span className="text-white">zen+</span> gives you everything you need to make your <span className="text-zen-violet">craziest</span> work
                            yet.
                        </div>

                        <div className="text-base  md:text-xl ">
                            <div className="p-0 py-10 md:p-10 w-88 md:w-96">
                                <span className="text-white">zen+</span> offers hundreds
                                of core operators for both <span className="text-white">audio</span> and <span className="text-white">graphics</span>.


                            </div>
                            <div className="p-0 py-10 md:p-10 pt-0 w-80 md:w-96">
                                built on the foundation of <span className="text-white">AudioWorklets</span> and <span className="text-white">WebGL</span> for blazing performance
                            </div>
                        </div>
                        <div className="text-sm md:text-base text-zen-violet ml-0 md:ml-10 font-normal">
                            <div><span className="text-white">+</span> discover new ideas by connecting nodes</div>
                            <div><span className="text-white">+</span> execute your vision intuitively</div>
                            <div><span className="text-white">+</span> tightly couple sound with motion</div>
                            <div><span className="text-white">+</span> build complexity through simplicity</div>
                            <div><span className="text-white">+</span> share your work to the world </div>
                        </div>
                    </div>
                    <div style={{ opacity: ratio3, transform: `translate(0px, ${500 - 500 * ratio}px)` }} className="mx-2 md:mx-auto md:w-full w-80 md:my-auto mt-10 md:mt-20 flex p-4 bg-zinc-800 rounded-xl  flex">
                        <img className="h-full w-full object-contain" src="patching-heaven.png" />
                    </div>
                </div>
            </Detail>
            <Detail textClassName="text-zen-blue" header="FLEXIBLE MODULAR SYNTHESIS" isMax={true}>
                <div >
                    <div className="flex md:flex-row flex-col">
                        <div>
                            <div className="text-3xl w-96">
                                <span className="text-white">zen+</span> transforms your browser into a <span className="text-zen-blue">sound laboratory</span>.
                            </div>
                            <div className="text-xl ">
                                <div className="py-10 p-0 md:p-10 w-96">
                                    generate and process <span className="text-white">audio</span> intuitively with powerful <span className="text-white">abstractions</span>.

                                </div>
                                <div className="py-10 p-0 md:p-10 pt-0 w-96">
                                    morph sound into any <span className="text-white">shape</span> you can imagine with sample-accurate <span className="text-white">modulation</span>.
                                </div>
                            </div>
                            <div className="text-sm md:text-base text-zen-blue ml-0 md:ml-10 font-normal">
                                <div><span className="text-white">+</span>  build new modules with built-in UX elements</div>
                                <div><span className="text-white">+</span> grow your toolbox and share with the community</div>
                                <div><span className="text-white">+</span> learn new sound design techniques in realtime.</div>
                            </div>
                        </div>
                        <div
                            style={{ transform: `translate(0px, ${500 - 500 * ratio2}px)` }}
                            className="md:w-96 w-72 mx-4 md:mx-auto md:mt-0 mt-10 md:mt-20 flex p-4 bg-zinc-800 rounded-xl ">
                            <img className="object-contain" src="sound-lab.png" />
                        </div>
                    </div>
                    <img src="curve2.svg" className="mx-auto w-3/4 my-20" />
                </div>
            </Detail >

            <Detail textClassName="text-zen-yellow" header="MAGIC FILES" isMax={false}>
                <div className="flex md:flex-row flex-col mb-20 items-start content-start">
                    <div className="mr-0 md:mr-20">
                        <div className="text-3xl w-80 md:w-96">
                            Never lose an <span className="text-white">idea</span>, with full <span className="text-zen-yellow">revision history</span>.
                        </div>
                        <div className="text-xl ">
                            <div className="p-0 py-10 md:p-10 w-96">
                                Constantly remix and tweak your work knowing that every change is saved <span className="text-white">automatically</span>.
                            </div>
                            <div className="p-0 py-10 md:p-10 pt-0 w-96">

                                <div>Proud of particular patch?</div>
                                <div>
                                    <span className="text-white">Share</span> your work with one-click.
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mx-2 md:mx-auto  flex p-4 bg-zinc-900 rounded-xl h-28 md:h-72 items-start">
                        <img className="w-full h-full  object-contain" src="revision-history.png" />
                    </div>
                </div>
            </Detail >

            <Detail textClassName="text-zen-pink" header="ONCHAIN EXPORT" isMax={false}>
                <div className="flex mb-20 md:flex-row flex-col">
                    <div>
                        <div className="text-3xl w-80 md:w-96">
                            Make your work <span className="text-white">eternal</span>, and <span className="text-zen-pink">get paid</span>.
                        </div>
                        <div className="text-xl ">
                            <div className="p-0 py-10 md:p-10 w-80 md:w-96">
                                Minting your work as a fully onchain<span className="text-zen-pink">*</span> NFT establishes strong <span className="text-white">provenance</span> and ensures it’ll live on <span className="text-white">forever.</span>
                            </div>
                            <div className="p-0 py-10 md:p-10 pt-0 w-80 md:w-96">

                                <div>Proud of particular patch?</div>
                                <div>
                                    <span className="text-white">Share</span> your work with one-click.
                                </div>
                            </div>
                            <div className="p-0 py-10 md:p-10 pt-0 w-96 italic">
                                No files needed.
                            </div>
                        </div>

                        <div className="text-sm md:text-base text-zen-pink ml-0 md:ml-10 font-normal">
                            <div><span className="text-white">+</span> An HTML NFT containing no outside dependencies</div>
                            <div><span className="text-white">+</span> Mint on the Zora Network (a low-cost Ethereum L2)</div>
                        </div>
                    </div>
                    <div className="mx-4 md:mx-auto  flex p-4 md:mt-0 mt-10 md:mt-20 bg-zinc-800 rounded-xl w-80 md:w-96 ">
                        <img className="object-contain" src="onchain-export.png" />
                    </div>
                </div>
            </Detail >

            <Detail header="" textClassName="text-white" isMax={false}>
                <div className="flex text-white text-center flex-col">
                    <img className="w-3/4 mx-auto my-20" src="dotdash.svg" />
                    <img className="spin w-1/4 mx-auto my-20" src="dotdashcircle.svg" />
                    <img src="rainbow-logo.png" className="w-52 mx-auto my-40" />
                </div>
            </Detail>


        </div >
    );
};

const Detail: React.FC<{ opacity?: number, isMax: boolean, textClassName: string, header: string, children: React.ReactNode }> = ({ textClassName, header, children, isMax = true, opacity }) => {
    return <div style={isMax ? { opacity: opacity, minHeight: "100vh" } : {}} className="w-full ml-10 md:ml-10 pt-10 md:pt-20 border-t border-t-zinc-800 px-5 md:px-20 font-semibold text-zinc-500 ">
        <div className={"mb-10 " + textClassName}>
            {header}
        </div>
        {children}
    </div>

};


export default LandingDetails;
