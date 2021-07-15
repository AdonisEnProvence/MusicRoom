import { useSx } from '@dripsy/core';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';

type MusicPlayerControlButtonProps = {
    iconName: React.ComponentProps<typeof Ionicons>['name'];
    variant?: 'prominent' | 'normal';
    adjustIconHorizontally?: 2 | 1;
    onPress: () => void;
    disabled?: boolean;
};

const MusicPlayerControlButton: React.FC<
    MusicPlayerControlButtonProps & TouchableOpacityProps
> = ({
    iconName,
    adjustIconHorizontally,
    variant = 'normal',
    onPress,
    disabled,
    ...props
}) => {
    const sx = useSx();

    return (
        <TouchableOpacity
            disabled
            style={sx({
                width: 56,
                height: 56,
                padding: 'm',
                marginLeft: 'm',
                marginRight: 'm',
                opacity: disabled ? 0.7 : 1,
                backgroundColor:
                    variant === 'prominent'
                        ? disabled
                            ? 'grey'
                            : 'white'
                        : 'transparent',
                borderRadius: 'full',
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
            })}
            onPress={onPress}
            {...props}
        >
            <Ionicons
                name={iconName}
                style={sx({
                    opacity: disabled ? 0.7 : 1,
                    color: disabled
                        ? 'greyLight'
                        : variant === 'prominent'
                        ? 'greyLight'
                        : 'white',
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
