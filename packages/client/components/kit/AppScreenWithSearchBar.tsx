import { Sender } from '@xstate/react/lib/types';
import React from 'react';
import { TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppScreenHeaderWithSearchBarMachineEvent } from '../../machines/appScreenHeaderWithSearchBarMachine';
import AppScreen from './AppScreen';
import AppScreenContainer from './AppScreenContainer';
import AppScreenHeaderWithSearchBar from './AppScreenHeaderWithSearchBar';

type AppScreenWithSearchBarProps = {
    title: string;
    searchInputPlaceholder: string;
    showHeader: boolean;
    screenOffsetY: number;
    setScreenOffsetY: (offsetY: number) => void;
    searchQuery: string;
    sendToSearch: Sender<AppScreenHeaderWithSearchBarMachineEvent>;
} & (
    | {
          canGoBack: true;
          goBack: () => void;
      }
    | { canGoBack?: false }
);

const AppScreenWithSearchBar: React.FC<AppScreenWithSearchBarProps> = ({
    title,
    searchInputPlaceholder,
    showHeader,
    screenOffsetY,
    setScreenOffsetY,
    searchQuery,
    sendToSearch,
    children,
    ...args
}) => {
    const insets = useSafeAreaInsets();

    return (
        <AppScreen screenOffsetY={showHeader === true ? 0 : screenOffsetY}>
            <AppScreenHeaderWithSearchBar
                title={title}
                searchInputPlaceholder={searchInputPlaceholder}
                insetTop={insets.top}
                setScreenOffsetY={setScreenOffsetY}
                searchQuery={searchQuery}
                sendToMachine={sendToSearch}
                showHeader={showHeader}
                {...args}
            />

            <TouchableWithoutFeedback
                onPress={() => {
                    sendToSearch({
                        type: 'BLUR',
                    });
                }}
            >
                <View style={{ flex: 1 }}>
                    <AppScreenContainer>{children}</AppScreenContainer>
                </View>
            </TouchableWithoutFeedback>
        </AppScreen>
    );
};

export default AppScreenWithSearchBar;
