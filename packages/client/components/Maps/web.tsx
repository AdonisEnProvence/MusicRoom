import React, { forwardRef } from 'react';
import GoogleMapReact from 'google-map-react';
import { Text, View } from 'dripsy';
import { LatlngCoords } from '@musicroom/types';
import { GOOGLE_MAPS_JAVASCRIPT_API_KEY } from '../../constants/ApiKeys';
import { MapsComponent, MapRef, MapsProps } from './contract';

const WebMaps: MapsComponent = forwardRef<MapRef, MapsProps>(
    (
        {
            positionConstraintRadius,
            devicePosition,
            positionConstraintPosition,
            ...props
        },
        _,
    ) => {
        const devicePositionIsDefined = devicePosition !== undefined;
        return (
            <View
                style={{
                    height: '100vh',
                    width: '100%',
                }}
            >
                <GoogleMapReact
                    {...props}
                    defaultCenter={positionConstraintPosition}
                    bootstrapURLKeys={{ key: GOOGLE_MAPS_JAVASCRIPT_API_KEY }}
                    yesIWantToUseGoogleMapApiInternals={true}
                    onGoogleApiLoaded={({ map }) => {
                        new google.maps.Marker({
                            position: {
                                ...positionConstraintPosition,
                            },
                            label: 'Position constraint center',
                            map,
                        });
                        if (devicePositionIsDefined) {
                            new google.maps.Marker({
                                position: {
                                    ...devicePosition,
                                },
                                map,
                            });
                        }
                        new google.maps.Circle({
                            strokeColor: '#1db954',
                            strokeOpacity: 0.4,
                            strokeWeight: 1,
                            fillColor: '#1db954',
                            fillOpacity: 0.3,
                            map,
                            center: {
                                ...positionConstraintPosition,
                            },
                            radius: positionConstraintRadius,
                        });
                    }}
                />
            </View>
        );
    },
);

export default WebMaps;
