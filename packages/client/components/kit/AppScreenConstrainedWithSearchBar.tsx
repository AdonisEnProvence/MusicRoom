import React from 'react';
import AppScreenConstrained from './AppScreenConstrained';
import {
    AppScreenWithSearchBarInternal,
    AppScreenWithSearchBarProps,
} from './AppScreenWithSearchBar';

const AppScreenConstrainedWithSearchBar: React.FC<AppScreenWithSearchBarProps> =
    (props) => {
        return (
            <AppScreenWithSearchBarInternal
                Wrapper={AppScreenConstrained}
                {...props}
            />
        );
    };

export default AppScreenConstrainedWithSearchBar;
