import React from 'react';
import { useSx } from 'dripsy';
import { TouchableOpacity } from 'react-native';

interface BottomRightAbsoluteButtonProps {
    onPress: () => void;
    Icon: () => React.ReactElement;
    testID: string;
}

const BottomRightAbsoluteButton: React.FC<BottomRightAbsoluteButtonProps> = ({
    onPress,
    Icon,
    testID,
}) => {
    const sx = useSx();

    return (
        <TouchableOpacity
            testID={`${testID}-absolute-button`}
            style={sx({
                position: 'absolute',
                right: 0,
                bottom: 0,
                zIndex: 22,
                borderRadius: 'full',
                backgroundColor: 'secondary',
                width: 48,
                height: 48,
                margin: 'm',
                justifyContent: 'center',
                alignItems: 'center',

                // Copy pasted from https://ethercreative.github.io/react-native-shadow-generator/
                shadowColor: '#000',
                shadowOffset: {
                    width: 0,
                    height: 2,
                },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,

                elevation: 5,
            })}
            onPress={onPress}
        >
            <Icon />
        </TouchableOpacity>
    );
};

export default BottomRightAbsoluteButton;
