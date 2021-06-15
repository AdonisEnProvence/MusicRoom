import { Ionicons } from '@expo/vector-icons';
import { useActor, useMachine } from '@xstate/react';
import { useSx, View } from 'dripsy';
import { View as MotiView } from 'moti';
import React, { useState } from 'react';
import { FlatList, ListRenderItem, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActorRef } from 'xstate';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeaderWithSearchBar,
    Typo,
} from '../components/kit';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import {
    AppScreenHeaderWithSearchBarMachineEvent,
    AppScreenHeaderWithSearchBarMachineState,
} from '../machines/appScreenHeaderWithSearchBarMachine';
import { searchMtvRoomsMachine } from '../machines/searchMtvRoomsMachine';
import { MusicTrackVoteSearchScreenProps } from '../types';

type SuggestionListProps = {
    bottomInset: number;
    onSuggestionPress: (id: string) => void;
    suggestions: RoomSuggestion[];
};

interface RoomSuggestion {
    roomID: string;
}

const SuggestionsList: React.FC<SuggestionListProps> = ({
    bottomInset,
    onSuggestionPress,
    suggestions,
}) => {
    const sx = useSx();

    const renderItem: ListRenderItem<RoomSuggestion> = ({
        item: { roomID },
    }) => (
        <TouchableOpacity
            onPress={() => {
                onSuggestionPress(roomID);
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
                    <Typo sx={{ fontSize: 's' }}>{roomID}</Typo>
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
            keyExtractor={({ roomID }) => roomID}
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
    const [mtvRoomState] = useMachine(searchMtvRoomsMachine);
    const searchBarActor: ActorRef<
        AppScreenHeaderWithSearchBarMachineEvent,
        AppScreenHeaderWithSearchBarMachineState
    > = mtvRoomState.children.searchBarMachine;
    const [searchState, sendToSearch] = useActor(searchBarActor);
    const showHeader = searchState.hasTag('showHeaderTitle');
    const showSuggestions = searchState.hasTag('showSuggestions');
    const reduceSuggestionsOpacity = searchState.hasTag(
        'reduceSuggestionsOpacity',
    );
    const { sendToMachine: sendToMusicPlayerMachine } = useMusicPlayer();

    return (
        <AppScreen screenOffsetY={showHeader === true ? 0 : screenOffsetY}>
            <AppScreenHeaderWithSearchBar
                title="Track Vote"
                searchInputPlaceholder="Search a room..."
                insetTop={insets.top}
                setScreenOffsetY={setScreenOffsetY}
                searchQuery={searchState.context.searchQuery}
                sendToMachine={sendToSearch}
                showHeader={showHeader}
                canGoBack={true}
                goBack={() => {
                    navigation.goBack();
                }}
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
                            suggestions={
                                mtvRoomState.context.rooms?.map((el) => ({
                                    roomID: el,
                                })) ?? []
                            }
                            bottomInset={insets.bottom}
                            onSuggestionPress={(roomID: string) => {
                                sendToMusicPlayerMachine({
                                    type: 'JOIN_ROOM',
                                    roomID,
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
