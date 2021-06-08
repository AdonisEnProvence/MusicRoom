import React from 'react';
import Title from './Title';

export const AppScreenHeaderTitle: React.FC = ({ children }) => {
    return (
        <Title numberOfLines={1} sx={{ flex: 1 }}>
            {children}
        </Title>
    );
};

export default AppScreenHeaderTitle;
