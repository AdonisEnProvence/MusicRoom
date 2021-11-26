import React, { forwardRef } from 'react';
import GoogleMapReact from 'google-map-react';
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
        //Weird this should be working with newest version of typescript
        const devicePositionIsDefined = devicePosition !== undefined;
        return (
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
                    if (devicePosition !== undefined) {
                        new google.maps.Marker({
                            title: 'You',
                            position: {
                                lat: devicePosition.lat,
                                lng: devicePosition.lng,
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
        );
    },
);

export default WebMaps;
