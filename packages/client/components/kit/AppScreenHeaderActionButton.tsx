import React from 'react';
import { View } from 'dripsy';

const AppScreenHeaderRightAction: React.FC<{
    children: React.ReactElement;
}> = ({ children }) => {
    return (
        <View
            sx={{
                flexGrow: 1,
                flexDirection: 'row',
                justifyContent: 'flex-end',
            }}
        >
            {children}
        </View>
    );
};

export default AppScreenHeaderRightAction;
