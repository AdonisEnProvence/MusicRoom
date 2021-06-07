import React, { useState } from 'react';
import { View, useSx } from 'dripsy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMachine } from '@xstate/react';
import { TouchableOpacity, ListRenderItem, FlatList } from 'react-native';
import { View as MotiView } from 'moti';
import { appScreenHeaderWithSearchBarMachine } from '../machines/appScreenHeaderWithSearchBarMachine';
import { MusicTrackVoteSearchScreenProps } from '../types';
import {
    Typo,
    AppScreen,
    AppScreenHeaderWithSearchBar,
    AppScreenContainer,
} from '../components/kit';

type SuggestionListProps = {
    bottomInset: number;
    onSuggestionPress: (id: string) => void;
};

interface RoomSuggestion {
    title: string;
}

const SuggestionsList: React.FC<SuggestionListProps> = ({
    bottomInset,
    onSuggestionPress,
}) => {
    const sx = useSx();

    const suggestions: RoomSuggestion[] = [
        {
            title: 'Claude Nougaro - Toulouse Eheheheheheheheheheh',
        },
        {
            title: 'Biolay Fans',
        },
        {
            title: 'Feu! Chatterton Fans',
        },
        {
            title: 'Orelsan Fans',
        },
        {
            title: 'Alain Bashung Fans',
        },
        {
            title: 'Francis Cabrel Fans',
        },
    ];

    const renderItem: ListRenderItem<RoomSuggestion> = ({
        item: { title },
    }) => (
        <TouchableOpacity
            onPress={() => {
                onSuggestionPress(title);
            }}
        >
            <View
                sx={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'm',
                }}
            >
                <View>
                    <Typo sx={{ fontSize: 's' }}>{title}</Typo>
                    <Typo sx={{ fontSize: 'xs', color: 'greyLighter' }}>
                        Baptiste Devessier
                    </Typo>
                </View>

                <Ionicons
                    name="chevron-forward"
                    style={sx({
                        color: 'greyLighter',
                        fontSize: 'm',
                    })}
                />
            </View>
        </TouchableOpacity>
    );

    return (
        <FlatList
            data={suggestions}
            renderItem={renderItem}
            ListHeaderComponent={() => (
                <Typo
                    sx={{ fontSize: 's', fontWeight: '700', marginBottom: 'm' }}
                >
                    Suggestions
                </Typo>
            )}
            keyExtractor={({ title }) => title}
            // This is here that we ensure the Flat List will not show items
            // on an unsafe area.
            contentContainerStyle={{
                paddingBottom: bottomInset,
            }}
        />
    );
};

const SearchList: React.FC = () => {
    return (
        <View>
            <Typo>Search results</Typo>
        </View>
    );
};

const MusicTrackVoteSearchScreen: React.FC<MusicTrackVoteSearchScreenProps> = ({
    navigation,
}) => {
    const insets = useSafeAreaInsets();
    const [screenOffsetY, setScreenOffsetY] = useState(0);
    const [state, send] = useMachine(appScreenHeaderWithSearchBarMachine);
    const showHeader = state.hasTag('showHeaderTitle');
    const showSuggestions = state.hasTag('showSuggestions');
    const reduceSuggestionsOpacity = state.hasTag('reduceSuggestionsOpacity');

    return (
        <AppScreen screenOffsetY={showHeader === true ? 0 : screenOffsetY}>
            <AppScreenHeaderWithSearchBar
                title="Track Vote"
                searchInputPlaceholder="Search a room..."
                insetTop={insets.top}
                setScreenOffsetY={setScreenOffsetY}
                searchQuery={state.context.searchQuery}
                sendToMachine={send}
                showHeader={showHeader}
            />

            <AppScreenContainer>
                {showSuggestions ? (
                    <MotiView
                        animate={{
                            opacity:
                                reduceSuggestionsOpacity === true ? 0.7 : 1,
                        }}
                        style={{ flex: 1 }}
                    >
                        <SuggestionsList
                            bottomInset={insets.bottom}
                            onSuggestionPress={(roomId: string) => {
                                navigation.navigate('MusicTrackVote', {
                                    roomId,
                                });
                            }}
                        />
                    </MotiView>
                ) : (
                    <SearchList />
                )}
            </AppScreenContainer>
        </AppScreen>
    );
};

export default MusicTrackVoteSearchScreen;
