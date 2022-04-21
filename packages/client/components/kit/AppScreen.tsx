import React from 'react';
import { View } from 'dripsy';
import { View as MotiView } from 'moti';

export type AppScreenProps = {
    testID?: string;
    screenOffsetY?: number;
};

const AppScreen: React.FC<AppScreenProps> = ({
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
            <View
                sx={{
                    flex: 1,
                    marginX: 'auto',
                    maxWidth: ['100%', 860],
                    width: '100%',
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
        </View>
    );
};

export default AppScreen;
