import { Sender } from '@xstate/react/lib/types';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScreenHeaderWithSearchBarMachineEvent } from '../../machines/appScreenHeaderWithSearchBarMachine';
import AppScreen from './AppScreen';
import AppScreenContainer from './AppScreenContainer';
import AppScreenHeaderWithSearchBar from './AppScreenHeaderWithSearchBar';

export type AppScreenWithSearchBarProps = {
    testID?: string;
    title: string;
    searchInputPlaceholder: string;
    showHeader: boolean;
    screenOffsetY: number;
    setScreenOffsetY: (offsetY: number) => void;
    searchQuery: string;
    sendToSearch: Sender<AppScreenHeaderWithSearchBarMachineEvent>;
    HeaderActionRight?: React.ReactElement;
} & (
    | {
          canGoBack: true;
          goBack: () => void;
      }
    | { canGoBack?: false }
);

export const AppScreenWithSearchBarInternal: React.FC<
    AppScreenWithSearchBarProps & {
        Wrapper: React.FC<{ testID?: string; screenOffsetY?: number }>;
    }
> = ({
    Wrapper,
    testID,
    title,
    searchInputPlaceholder,
    showHeader,
    screenOffsetY,
    setScreenOffsetY,
    searchQuery,
    sendToSearch,
    HeaderActionRight,
    children,
    ...args
}) => {
    const insets = useSafeAreaInsets();

    return (
        <Wrapper
            testID={testID}
            screenOffsetY={showHeader === true ? 0 : screenOffsetY}
        >
            <AppScreenHeaderWithSearchBar
                title={title}
                searchInputPlaceholder={searchInputPlaceholder}
                insetTop={insets.top}
                setScreenOffsetY={setScreenOffsetY}
                searchQuery={searchQuery}
                sendToMachine={sendToSearch}
                showHeader={showHeader}
                HeaderActionRight={HeaderActionRight}
                {...args}
            />

            <View style={{ flex: 1 }}>
                <AppScreenContainer>{children}</AppScreenContainer>
            </View>
        </Wrapper>
    );
};

const AppScreenWithSearchBar: React.FC<AppScreenWithSearchBarProps> = (
    props,
) => {
    return <AppScreenWithSearchBarInternal Wrapper={AppScreen} {...props} />;
};

export default AppScreenWithSearchBar;
