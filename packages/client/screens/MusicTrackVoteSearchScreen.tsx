import React, { ComponentProps, useEffect, useRef, useState } from 'react';
import { View, useSx, ScrollView } from 'dripsy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createMachine, assign, Sender } from 'xstate';
import { MusicTrackVoteSearchScreenProps } from '../types';
import { Title, Typo, TextInput } from '../components/kit';
import { useMachine } from '@xstate/react';
import { TouchableOpacity, TextInput as RNTextInput } from 'react-native';
import { AnimatePresence, View as MotiView } from 'moti';

type SearchBatProps = {
    query: string;
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
    setQuery,
    onBlur,
    onFocus,
}) => {
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

    function blurTextInput() {
        textInputRef.current?.blur();
    }

    function handleTextInputFocus() {
        send({
            type: 'FOCUS',
        });

        onFocus();
    }

    function handleTextInputBlur() {
        send({
            type: 'BLUR',
        });

        onBlur();
    }

    return (
        <View sx={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
            <View
                sx={{
                    flexDirection: 'row',
                    flex: 1,
                    backgroundColor: 'greyLight',
                    alignItems: 'center',
                    paddingLeft: 'm',
                    paddingRight: 'm',
                    borderRadius: 'm',
                }}
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
                    <TouchableOpacity onPress={blurTextInput}>
                        <Ionicons
                            name="close-circle-outline"
                            style={sx({
                                color: 'white',
                                fontSize: 'm',
                            })}
                        />
                    </TouchableOpacity>
                )}
            </View>
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
>({
    context: {
        searchQuery: '',
    },

    initial: 'idle',

    states: {
        idle: {
            on: {
                FOCUS: {
                    target: 'typing',
                },
            },
        },

        typing: {
            on: {
                BLUR: 'idle',

                UPDATE_SEARCH_QUERY: {
                    actions: assign({
                        searchQuery: (_context, { searchQuery }) => searchQuery,
                    }),
                },
            },
        },
    },
});

function useLayout() {
    const [layout, setLayout] = useState({
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
                paddingBottom: 'l',
            }}
        >
            <View style={{ marginBottom: titleMarginBottom }}>
                <AnimatePresence>
                    <MotiView
                        animate={{
                            opacity: showHeader ? 1 : 0,
                            scaleX: showHeader ? 1 : 0.9,
                            translateX: showHeader ? '0%' : '-20%',
                        }}
                        style={sx({
                            marginBottom: 'l',
                        })}
                        onLayout={onLayout}
                    >
                        <Title>Track vote</Title>
                    </MotiView>
                </AnimatePresence>

                <View sx={{ flexDirection: 'row' }}>
                    <SearchBar
                        query={searchQuery}
                        setQuery={handleUpdateSearchQuery}
                        onFocus={handleTextInputFocus}
                        onBlur={handleTextInputBlur}
                    />
                </View>
            </View>
        </View>
    );
};

const MusicTrackVoteSearchScreen: React.FC<MusicTrackVoteSearchScreenProps> = ({
    navigation,
}) => {
    const [offset, setOffset] = useState(0);
    const [state, send] = useMachine(screenHeaderMachine);
    const showHeader = state.matches('idle');

    const insets = useSafeAreaInsets();

    return (
        <View
            sx={{
                flex: 1,
                backgroundColor: 'primary',
                paddingBottom: insets.bottom,
            }}
        >
            <MotiView
                animate={{
                    top: showHeader ? 0 : offset,
                }}
            >
                <ScreenHeader
                    insetTop={insets.top}
                    setOffset={setOffset}
                    searchQuery={state.context.searchQuery}
                    sendToMachine={send}
                    showHeader={showHeader}
                />

                <ScrollView sx={{ paddingLeft: 'l', paddingRight: 'l' }}>
                    <Typo>Some random text</Typo>
                </ScrollView>
            </MotiView>
        </View>
    );
};

export default MusicTrackVoteSearchScreen;
