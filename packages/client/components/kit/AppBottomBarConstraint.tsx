import { View } from 'dripsy';
import React from 'react';

const AppBottomBarConstraint: React.FC = ({ children }) => {
    return (
        <View sx={{ backgroundColor: 'primary' }}>
            <View
                sx={{
                    maxWidth: ['100%', 860],
                    width: '100%',
                    marginX: 'auto',
                }}
            >
                {children}
            </View>
        </View>
    );
};

export default AppBottomBarConstraint;
