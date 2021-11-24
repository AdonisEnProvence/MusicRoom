import React, { forwardRef } from 'react';
import MapView from 'react-native-maps';
import { MapRef, MapsComponent, MapsProps } from './contract';

const NativeMaps: MapsComponent = forwardRef<MapRef, MapsProps>(
    (
        {
            positionConstraintPosition,
            positionConstraintRadius,
            devicePosition,
            ...props
        },
        _,
    ) => {
        return <MapView provider={'google'} />;
    },
);

export default NativeMaps;
