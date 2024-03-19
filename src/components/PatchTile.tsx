import React, { useEffect, useRef } from 'react';
import { Tile } from '@/lib/tiling/types';
import PatchWrapper from './PatchWrapper';
import { usePatches } from '@/contexts/PatchesContext';

const PatchTile: React.FC<{ fileToOpen: any | null, setFileToOpen: (x: any | null) => void, gridTemplate?: string, tile: Tile | null }> = ({ tile, setFileToOpen, fileToOpen }) => {

    let ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (tile) {
            tile.ref = ref;
        }
    }, [tile]);

    let direction = tile && tile.parent ? tile.parent.splitDirection : null;
    let mem;
    let _tile: Tile | null = tile && tile.children.length === 0 && tile.patch ?
        tile : tile && tile.children[0] && tile.children[0].patch ? tile.children[0] : null;
    let PRE_INDEX = 0;
    if (_tile) {
        if (_tile && _tile.patch) {
            let _direction = _tile.parent ? _tile.parent.splitDirection : null;
            let cl = _direction === "vertical" ? "mx-2" : "my-2";
            let size = _tile.parent ? _tile.parent.size : 0;
            if (_tile.parent) {
                if (_tile.parent.children[1] === tile) {
                    size = 100 - size;
                }
            } else {
                size = 100;
            }
            let maxWidth = _direction === "horizontal" ? size : 100;
            let maxHeight = _direction === "vertical" ? size : 100;
            mem = (
                <PatchWrapper
                    tileRef={ref}
                    fileToOpen={fileToOpen}
                    setFileToOpen={setFileToOpen}
                    key={0}// + (_tile.patch ? _tile.patch.id : '')}
                    maxWidth={maxWidth} maxHeight={maxHeight} index={0} patch={_tile.patch} />
            );
            PRE_INDEX = 1;
        }
    }

    if (!tile) {
        return <></>;
    }
    let cl = "flex-1 h-full w-full";
    let size = tile.size;
    if (tile.parent) {
        direction = tile.parent.splitDirection;
        if (tile.parent.children[1] === tile) {
            size = 100 - size;
        }
    } else {
        size = 100;
    }

    let _maxWidth = 100;
    let _maxHeight = 100;

    if (tile) {
        let vparent: any = tile.parent;
        let vprev = tile;
        while (vparent && vparent.splitDirection !== "vertical") {
            vprev = vparent;
            vparent = vparent.parent;
        }

        let hparent: any = tile.parent;
        let hprev = tile;
        while (hparent && hparent.splitDirection !== "horizontal") {
            hprev = hparent;
            hparent = hparent.parent;
        }

        if (hparent) {
            _maxWidth = hparent && hparent.children[0] === hprev ?
                hparent.size : 100 - hparent.size;
        }
        if (vparent) {
            _maxHeight = vparent && vparent.children[0] === vprev ?
                vparent.size : 100 - vparent.size;
        }

        if (tile.parent && tile.parent.splitDirection === "vertical") {
            _maxWidth = 100;
        }
        if (tile.parent && tile.parent.splitDirection === "horizontal") {
            _maxHeight = 100;
        }
    }

    // console.log("tile container maxWidth=%s maxHeight=%s", _maxWidth, _maxHeight, tile);

    if (tile.patch && tile.parent) {
        /*
        let _direction = tile.parent ? tile.parent.splitDirection : null;
        return (<PatchWrapper
            fileToOpen={fileToOpen}
            setFileToOpen={setFileToOpen}
            //key={i + (_tile.patch ? _tile.patch.id : '')}
            maxWidth={_direction === "horizontal" ? size : 100} maxHeight={_direction === "vertical" ? size : 100} index={0} patch={tile.patch} />
        );
        */
    }

    let remainder = tile.children[0] && tile.children[0].patch;
    let children = tile.children.length === 0 && tile.patch ? [mem] : [...(remainder ? [mem] : []), ...tile.children.slice(remainder ? 1 : 0).map((tile: Tile, i: number) => {
        //if (remainder) {
        //    i += 1;
        //}

        let _tile: Tile = tile; //Tile | null = tile.children.length === 0 && tile.patch ?
        // tile : tile.children[0].patch ? tile.children[0] : null;

        if (_tile && _tile.patch && false) {
            /*
            let _direction = _tile.parent ? _tile.parent.splitDirection : null;
            let cl = _direction === "vertical" ? "mx-2" : "my-2";
            let size = _tile.parent ? _tile.parent.size : 0;
            if (_tile.parent) {
                if (_tile.parent.children[1] === _tile) {
                    size = 100 - size;
                }
            } else {
                size = 100;
            }
            return (
                <PatchWrapper
                    fileToOpen={fileToOpen}
                    setFileToOpen={setFileToOpen}
                    key={i + (_tile.patch ? _tile.patch.id : '')}
                    maxWidth={_direction === "horizontal" ? size : 100} maxHeight={_direction === "vertical" ? size : 100} index={0} patch={_tile.patch} />
            );
            */
        } else {
            return <PatchTile
                fileToOpen={fileToOpen}
                setFileToOpen={setFileToOpen}
                tile={tile} key={tile.id} />
        }
    })];
    /*
    let keyframe = ``;
    let depth = tile.getDepth() + '____';
    if (tile.splitDirection === "horizontal") {
        keyframe = `@keyframes horizontal-slide-${depth} {
0% { max-width: 100%};
100% { max-width: ${_maxWidth}% }
}
`;
    } else {
        _maxWidth = 100
    }
    if (tile.splitDirection === "vertical") {
        keyframe = `@keyframes vertical-slide-${depth} {
0% { max-height: 100%};
100% { max-height: ${_maxHeight}% }
}
`;
    } else {
        _maxHeight = 100;
    }

    let animation = `${tile.splitDirection}-slide-${depth} 0.5s ease`;
    */

    return (
        <>
            <div
                ref={ref}
                style={true ? {} : { minWidth: _maxWidth + '%', maxWidth: _maxWidth + '%', maxHeight: _maxHeight + '%', minHeight: _maxHeight + '%' }}
                className={children.length === 1 ? "flex w-full h-full flex-1" : (cl + "  flex tile-container flex-1 " + (tile.splitDirection === "vertical" ? "flex-col" : "flex-row"))}>
                {children}
            </div>
        </>
    );
};
export default PatchTile;
