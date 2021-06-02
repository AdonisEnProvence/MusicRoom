import React, { useRef, useState } from 'react';
import { View, useSx, ScrollView } from 'dripsy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createMachine } from 'xstate';
import { MusicTrackVoteSearchScreenProps } from '../types';
import { Title, Typo, TextInput } from '../components/kit';
import { useMachine } from '@xstate/react';
import { TouchableOpacity, TextInput as RNTextInput } from 'react-native';

type ScreenHeaderProps = {
    insetTop: number;
};

type SearchBatProps = {
    query: string;
    setQuery: (query: string) => void;
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

const SearchBar: React.FC<SearchBatProps> = ({ query, setQuery }) => {
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
    }

    function handleTextInputBlur() {
        send({
            type: 'BLUR',
        });
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

const ScreenHeader: React.FC<ScreenHeaderProps> = ({ insetTop }) => {
    const [query, setQuery] = useState('');

    return (
        <View
            sx={{
                paddingTop: insetTop,
                paddingLeft: 'l',
                paddingRight: 'l',
                paddingBottom: 'l',
            }}
        >
            <View sx={{ paddingTop: 'l' }}>
                <Title>Track vote</Title>

                <View sx={{ marginTop: 'l', flexDirection: 'row' }}>
                    <SearchBar query={query} setQuery={setQuery} />
                </View>
            </View>
        </View>
    );
};

const MusicTrackVoteSearchScreen: React.FC<MusicTrackVoteSearchScreenProps> = ({
    navigation,
}) => {
    const insets = useSafeAreaInsets();

    return (
        <View
            sx={{
                flex: 1,
                backgroundColor: 'primary',
                paddingBottom: insets.bottom,
            }}
        >
            <ScreenHeader insetTop={insets.top} />

            <ScrollView sx={{ paddingLeft: 'l', paddingRight: 'l' }}>
                <Typo>Some random text</Typo>
            </ScrollView>
        </View>
    );
};

export default MusicTrackVoteSearchScreen;
