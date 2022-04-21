import React from 'react';
import AppScreenWithMenu from './AppScreenWithMenu';
import {
    AppScreenWithSearchBarInternal,
    AppScreenWithSearchBarProps,
} from './AppScreenWithSearchBar';

const AppScreenWithMenuWithSearchBar: React.FC<AppScreenWithSearchBarProps> = (
    props,
) => {
    return (
        <AppScreenWithSearchBarInternal
            Wrapper={AppScreenWithMenu}
            {...props}
        />
    );
};

export default AppScreenWithMenuWithSearchBar;
