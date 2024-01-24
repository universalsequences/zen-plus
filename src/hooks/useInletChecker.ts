import React, { useCallback } from 'react';
import { usePosition } from '@/contexts/PositionContext';

export const useInletChecker = () => {
    const { positions } = usePosition();
    const checkNearInlets = (x: number, y: number) => {
    };

    return { checkNearInlets }
};
