import React, { ComponentProps, useEffect, useRef, useState } from 'react';
import { View, useSx } from 'dripsy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createMachine, assign, Sender } from 'xstate';
import { MusicTrackVoteSearchScreenProps } from '../types';
import { Title, Typo, TextInput } from '../components/kit';
import { useMachine } from '@xstate/react';
import {
    TouchableOpacity,
    TextInput as RNTextInput,
    ListRenderItem,
    FlatList,
} from 'react-native';
import { View as MotiView } from 'moti';

type SearchBatProps = {
    query: string;
    showCancelButton: boolean;
    setQuery: (query: string) => void;
    onBlur: () => void;
    onFocus: () => void;
};

type SearchBarMachineContext = {
    searchQuery: string;
};

type SearchBarMachineEvent =
    | {
          type: 'BLUR';
      }
    | { type: 'FOCUS' };

const searchBarMachine = createMachine<
    SearchBarMachineContext,
    SearchBarMachineEvent
>({
    context: {
        searchQuery: '',
    },

    initial: 'inactive',

    states: {
        active: {
            on: {
                BLUR: {
                    target: 'inactive',
                    actions: ['resetSearchQuery', 'blurTextInput'],
                },
            },
        },

        inactive: {
            on: {
                FOCUS: {
                    target: 'active',
                },
            },
        },
    },
});

const SearchBar: React.FC<SearchBatProps> = ({
    query,
    showCancelButton,
    setQuery,
    onBlur,
    onFocus,
}) => {
    const [{ width: containerWidth }, onContainerLayout] = useLayout();
    const [{ width }, onLayout] = useLayout();
    const textInputRef = useRef<RNTextInput | null>(null);
    const [state, send] = useMachine(searchBarMachine, {
        actions: {
            resetSearchQuery: () => {
                setQuery('');
            },
            blurTextInput: () => {
                blurTextInput();
            },
        },
    });
    const sx = useSx();

    const cancelButtonLeftMargin = sx({ marginLeft: 'l' }).marginLeft as number;

    function blurTextInput() {
        textInputRef.current?.blur();
    }

    function handleTextInputFocus() {
        send({
            type: 'FOCUS',
        });

        onFocus();
    }

    function handleTextClear() {
        setQuery('');
    }

    function handleTextInputBlur() {
        send({
            type: 'BLUR',
        });

        onBlur();
    }

    return (
        <View
            sx={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}
            onLayout={onContainerLayout}
        >
            <MotiView
                animate={{
                    width: showCancelButton
                        ? containerWidth - width - cancelButtonLeftMargin
                        : containerWidth,
                }}
                style={sx({
                    flexDirection: 'row',
                    backgroundColor: 'greyLight',
                    alignItems: 'center',
                    paddingLeft: 'm',
                    paddingRight: 'm',
                    borderRadius: 'm',
                })}
            >
                <Ionicons
                    name="search"
                    style={sx({ color: 'white', fontSize: 's' })}
                />

                <TextInput
                    ref={(input) => {
                        // @ts-expect-error we could not find a way to use our TextInput component in a ref
                        textInputRef.current = input;
                    }}
                    placeholderTextColor="white"
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search a song here..."
                    sx={{ borderWidth: 0 }}
                    onFocus={handleTextInputFocus}
                    onBlur={handleTextInputBlur}
                />

                {state.matches('active') && query.length > 0 && (
                    <TouchableOpacity onPress={handleTextClear}>
                        <Ionicons
                            name="close-circle-outline"
                            style={sx({
                                color: 'white',
                                fontSize: 'm',
                            })}
                        />
                    </TouchableOpacity>
                )}
            </MotiView>

            <MotiView
                animate={{
                    opacity: showCancelButton ? 1 : 0,
                }}
            >
                <TouchableOpacity
                    style={{
                        marginLeft: cancelButtonLeftMargin,
                    }}
                    onLayout={onLayout}
                    onPress={blurTextInput}
                >
                    <Typo sx={{ fontSize: 's' }}>Cancel</Typo>
                </TouchableOpacity>
            </MotiView>
        </View>
    );
};

type ScreenHeaderMachineContext = {
    searchQuery: string;
};

type ScreenHeaderMachineEvent =
    | { type: 'FOCUS' }
    | { type: 'BLUR' }
    | { type: 'UPDATE_SEARCH_QUERY'; searchQuery: string };

const screenHeaderMachine = createMachine<
    ScreenHeaderMachineContext,
    ScreenHeaderMachineEvent
>(
    {
        context: {
            searchQuery: '',
        },

        initial: 'idle',

        states: {
            idle: {
                tags: ['showHeaderTitle', 'showSuggestions'],

                on: {
                    FOCUS: {
                        target: 'typing',
                    },
                },
            },

            typing: {
                initial: 'waitingSearchQuery',

                states: {
                    waitingSearchQuery: {
                        tags: ['showSuggestions'],

                        on: {
                            UPDATE_SEARCH_QUERY: {
                                target: 'editingSearchQuery',
                                actions: 'setSearchQuery',
                            },
                        },
                    },

                    editingSearchQuery: {
                        tags: ['showClearButton', 'showSearchResults'],

                        on: {
                            UPDATE_SEARCH_QUERY: [
                                {
                                    cond: 'isSearchQueryEmptyFromEvent',
                                    target: 'waitingSearchQuery',
                                    actions: 'setSearchQuery',
                                },
                                {
                                    actions: 'setSearchQuery',
                                },
                            ],
                        },
                    },
                },

                on: {
                    BLUR: 'idle',
                },
            },
        },
    },
    {
        actions: {
            setSearchQuery: assign((context, event) => {
                if (event.type !== 'UPDATE_SEARCH_QUERY') {
                    return context;
                }

                return {
                    ...context,
                    searchQuery: event.searchQuery,
                };
            }),
        },

        guards: {
            isSearchQueryEmptyFromEvent: (_context, event): boolean => {
                if (event.type !== 'UPDATE_SEARCH_QUERY') {
                    return true;
                }

                return event.searchQuery.length === 0;
            },
        },
    },
);

function useLayout() {
    const [layout, setLayout] = useState({
        width: 0,
        height: 0,
    });
    const onLayout: ComponentProps<typeof View>['onLayout'] = ({
        nativeEvent,
    }) => {
        console.log('native event', nativeEvent);

        setLayout(nativeEvent.layout);
    };

    return [layout, onLayout] as const;
}

type ScreenHeaderProps = {
    insetTop: number;
    setOffset: (offset: number) => void;
    showHeader: boolean;
    searchQuery: string;
    sendToMachine: Sender<ScreenHeaderMachineEvent>;
};

const ScreenHeader: React.FC<ScreenHeaderProps> = ({
    insetTop,
    showHeader,
    setOffset,
    searchQuery,
    sendToMachine,
}) => {
    const [{ height }, onLayout] = useLayout();
    const sx = useSx();
    const titleMarginBottom = sx({ marginBottom: 'l' }).marginBottom as number;

    useEffect(() => {
        setOffset(-height - titleMarginBottom);
    }, [setOffset, height, titleMarginBottom]);

    function handleTextInputFocus() {
        sendToMachine({
            type: 'FOCUS',
        });
    }

    function handleTextInputBlur() {
        sendToMachine({
            type: 'BLUR',
        });
    }

    function handleUpdateSearchQuery(searchQuery: string) {
        sendToMachine({
            type: 'UPDATE_SEARCH_QUERY',
            searchQuery,
        });
    }

    return (
        <View
            sx={{
                paddingTop: insetTop,
                paddingLeft: 'l',
                paddingRight: 'l',
            }}
        >
            <View style={{ marginBottom: titleMarginBottom }}>
                <MotiView
                    animate={{
                        opacity: showHeader ? 1 : 0,
                    }}
                    style={sx({
                        marginBottom: 'l',
                    })}
                    onLayout={onLayout}
                >
                    <Title>Track vote</Title>
                </MotiView>

                <View sx={{ flexDirection: 'row' }}>
                    <SearchBar
                        query={searchQuery}
                        showCancelButton={showHeader === false}
                        setQuery={handleUpdateSearchQuery}
                        onFocus={handleTextInputFocus}
                        onBlur={handleTextInputBlur}
                    />
                </View>
            </View>
        </View>
    );
};

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
            title: 'Claude Nougaro - Toulouse',
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
    const [offset, setOffset] = useState(0);
    const [state, send] = useMachine(screenHeaderMachine);
    const showHeader = state.hasTag('showHeaderTitle');
    const showSuggestions = state.hasTag('showSuggestions');

    const insets = useSafeAreaInsets();

    return (
        <View
            sx={{
                flex: 1,
                backgroundColor: 'primary',
            }}
        >
            <MotiView
                animate={{
                    translateY: showHeader ? 0 : offset,
                }}
                style={{
                    flex: 1,
                }}
            >
                <ScreenHeader
                    insetTop={insets.top}
                    setOffset={setOffset}
                    searchQuery={state.context.searchQuery}
                    sendToMachine={send}
                    showHeader={showHeader}
                />

                <View
                    sx={{
                        paddingLeft: 'l',
                        paddingRight: 'l',
                        flex: 1,
                    }}
                >
                    {showSuggestions ? (
                        <SuggestionsList
                            bottomInset={insets.bottom}
                            onSuggestionPress={(roomId: string) => {
                                navigation.navigate('MusicTrackVote', {
                                    roomId,
                                });
                            }}
                        />
                    ) : (
                        <SearchList />
                    )}
                </View>
            </MotiView>
        </View>
    );
};

export default MusicTrackVoteSearchScreen;
