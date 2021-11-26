import React, { forwardRef } from 'react';
import MapView, { Circle, Marker } from 'react-native-maps';
import { MapRef, MapsComponent, MapsProps } from './contract';

const NativeMaps: MapsComponent = forwardRef<MapRef, MapsProps>(
    (
        {
            positionConstraintPosition,
            positionConstraintRadius,
            devicePosition,
        },
        _,
    ) => {
        return (
            <MapView
                initialRegion={{
                    latitude: positionConstraintPosition.lat,
                    longitude: positionConstraintPosition.lng,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                style={{
                    width: '100%',
                    height: '100%',
                }}
                provider={'google'}
            >
                <Circle
                    testID={'position-constraint-circle'}
                    center={{
                        latitude: positionConstraintPosition.lat,
                        longitude: positionConstraintPosition.lng,
                    }}
                    radius={positionConstraintRadius}
                    fillColor={`rgba(29, 185, 84, 0.3)`}
                    strokeColor={`rgba(29, 185, 84, 0.4)`}
                />

                <Marker
                    testID={'position-constraint-marker'}
                    title={'Music Track Vote'}
                    coordinate={{
                        latitude: positionConstraintPosition.lat,
                        longitude: positionConstraintPosition.lng,
                    }}
                />
                {devicePosition !== undefined && (
                    <Marker
                        testID={'device-position-marker'}
                        title={'You'}
                        coordinate={{
                            latitude: devicePosition.lat,
                            longitude: devicePosition.lng,
                        }}
                    />
                )}
            </MapView>
        );
    },
);

export default NativeMaps;
