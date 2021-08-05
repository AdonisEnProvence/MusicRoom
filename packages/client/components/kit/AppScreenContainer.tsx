import React from 'react';
import { View } from 'dripsy';

interface AppScreenContainerProps {
    scrollable?: boolean;
}

const AppScreenContainer: React.FC<AppScreenContainerProps> = ({
    scrollable = false,
    children,
}) => {
    return (
        <View
            sx={{
                paddingLeft: 'l',
                paddingRight: 'l',
                flex: 1,

                // Enable vertical scrolling on tablets and desktops.
                overflow:
                    scrollable === true ? [undefined, 'scroll'] : undefined,
            }}
        >
            {children}
        </View>
    );
};

export default AppScreenContainer;
