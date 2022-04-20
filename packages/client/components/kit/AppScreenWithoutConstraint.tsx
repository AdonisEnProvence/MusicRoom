import React from 'react';
import { View } from 'dripsy';
import { View as MotiView } from 'moti';
import { AppScreenProps } from './AppScreen';

const AppScreenWithoutConstraint: React.FC<AppScreenProps> = ({
    testID,
    screenOffsetY = 0,
    children,
}) => {
    return (
        <View
            testID={testID}
            sx={{
                flex: 1,
                backgroundColor: 'primary',
            }}
        >
            <MotiView
                animate={{
                    translateY: screenOffsetY,
                }}
                style={{
                    flex: 1,
                }}
            >
                {children}
            </MotiView>
        </View>
    );
};

export default AppScreenWithoutConstraint;
