import React, { forwardRef } from 'react';
import MapView, { Circle, Marker } from 'react-native-maps';
import { View, Text } from 'dripsy';
import { Dimensions } from 'react-native';
import { MtvRoomPhysicalAndTimeConstraints } from '@musicroom/types';
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
        const height = Dimensions.get('window').height;
        const width = Dimensions.get('window').width;
        return (
            <MapView
                initialRegion={{
                    latitude: positionConstraintPosition.lat,
                    longitude: positionConstraintPosition.lng,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                style={{
                    width: width,
                    height: height,
                }}
                provider={'google'}
            >
                <Circle
                    center={{
                        latitude: positionConstraintPosition.lat,
                        longitude: positionConstraintPosition.lng,
                    }}
                    radius={positionConstraintRadius}
                    fillColor={`rgba(29, 185, 84, 0.3)`}
                    strokeColor={`rgba(29, 185, 84, 0.4)`}
                />

                <Marker
                    title={'Music Track Vote p'}
                    coordinate={{
                        latitude: positionConstraintPosition.lat,
                        longitude: positionConstraintPosition.lng,
                    }}
                />
                {devicePosition !== undefined && (
                    <Marker
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
