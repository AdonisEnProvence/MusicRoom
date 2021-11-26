import { LatlngCoords } from '@musicroom/types';
import React from 'react';

export interface MapsProps {
    positionConstraintRadius: number;
    devicePosition?: LatlngCoords;
    positionConstraintPosition: LatlngCoords;
    defaultZoom: number;
}

export type MapsComponent = React.ForwardRefExoticComponent<
    MapsProps & React.RefAttributes<MapRef>
>;

//Not using a ref for the moment, might be removed later
export interface MapRef {
    eslint: boolean;
}
