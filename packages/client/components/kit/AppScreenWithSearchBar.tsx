import { Sender } from '@xstate/react/lib/types';
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScreenHeaderWithSearchBarMachineEvent } from '../../machines/appScreenHeaderWithSearchBarMachine';
import AppScreen from './AppScreen';
import AppScreenConstrained from './AppScreenConstrained';
import AppScreenContainer from './AppScreenContainer';
import AppScreenHeaderWithSearchBar from './AppScreenHeaderWithSearchBar';

type AppScreenWithSearchBarProps = {
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

const AppScreenWithSearchBar: React.FC<AppScreenWithSearchBarProps> = ({
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
        <AppScreenConstrained
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
        </AppScreenConstrained>
    );
};

export default AppScreenWithSearchBar;
