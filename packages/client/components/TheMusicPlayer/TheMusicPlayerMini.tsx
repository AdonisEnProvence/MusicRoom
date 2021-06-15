import React from 'react';
import { useSx, View } from 'dripsy';
import { Typo } from '../kit';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type TheMusicPlayerMiniProps = {
    height: number;
    roomName?: string;
    currentTrackName?: string;
    currentTrackArtist?: string;
};

const TheMusicPlayerMini: React.FC<TheMusicPlayerMiniProps> = ({
    height,
    ...props
}) => {
    const sx = useSx();
    const isInRoom = props.roomName !== undefined;
    const firstLine =
        isInRoom === true ? props.roomName : 'Join a room to listen to music';
    const secondLine =
        isInRoom === true
            ? `${props.currentTrackName} • ${props.currentTrackArtist}`
            : '-';

    return (
        <View
            sx={{
                height,
                flexDirection: 'row',
                alignItems: 'center',
                paddingLeft: 'l',
                paddingRight: 'l',
            }}
        >
            <View
                sx={{
                    flex: 1,
                    justifyContent: 'center',
                    marginRight: 'xl',
                }}
            >
                <Typo numberOfLines={1} sx={{ fontSize: 's' }}>
                    {firstLine}
                </Typo>

                <Typo
                    numberOfLines={1}
                    sx={{ fontSize: 'xs', color: 'greyLighter' }}
                >
                    {secondLine}
                </Typo>
            </View>

            <TouchableOpacity
                disabled={isInRoom === false}
                onPress={() => {
                    console.log('toggle');
                }}
            >
                <Ionicons
                    name="pause"
                    style={sx({
                        fontSize: 'xl',
                        color: 'white',
                    })}
                />
            </TouchableOpacity>
        </View>
    );
};

export default TheMusicPlayerMini;
