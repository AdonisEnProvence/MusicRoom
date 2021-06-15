import { useSx } from '@dripsy/core';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity } from 'react-native';

type MusicPlayerControlButtonProps = {
    iconName: React.ComponentProps<typeof Ionicons>['name'];
    variant?: 'prominent' | 'normal';
    adjustIconHorizontally?: 2 | 1;
    onPress: () => void;
};

const MusicPlayerControlButton: React.FC<MusicPlayerControlButtonProps> = ({
    iconName,
    adjustIconHorizontally,
    variant = 'normal',
    onPress,
}) => {
    const sx = useSx();

    return (
        <TouchableOpacity
            style={sx({
                width: 56,
                height: 56,
                padding: 'm',
                marginLeft: 'm',
                marginRight: 'm',
                backgroundColor:
                    variant === 'prominent' ? 'white' : 'transparent',
                borderRadius: 'full',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
            })}
            onPress={onPress}
        >
            <Ionicons
                name={iconName}
                style={sx({
                    color: variant === 'prominent' ? 'greyLight' : 'white',
                    fontSize: 'xl',
                    right:
                        adjustIconHorizontally !== undefined
                            ? -1 * adjustIconHorizontally
                            : 0,
                })}
            />
        </TouchableOpacity>
    );
};

export default MusicPlayerControlButton;
