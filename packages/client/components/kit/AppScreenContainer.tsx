import React from 'react';
import { View } from 'dripsy';

const AppScreenContainer: React.FC = ({ children }) => {
    return (
        <View
            sx={{
                paddingLeft: 'l',
                paddingRight: 'l',
                flex: 1,
            }}
        >
            {children}
        </View>
    );
};

export default AppScreenContainer;
