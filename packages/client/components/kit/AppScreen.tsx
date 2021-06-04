import React from 'react';
import { View } from 'dripsy';
import { View as MotiView } from 'moti';

type AppScreenProps = {
    screenOffsetY: number;
};

const AppScreen: React.FC<AppScreenProps> = ({ screenOffsetY, children }) => {
    return (
        <View
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

export default AppScreen;
