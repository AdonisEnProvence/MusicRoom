import { useMachine } from '@xstate/react';
import React, { useEffect, useRef } from 'react';
import { TextInput as RNTextInput, TouchableOpacity } from 'react-native';
import { createMachine } from 'xstate';
import { View as MotiView } from 'moti';
import { useSx, View } from 'dripsy';
import { Ionicons } from '@expo/vector-icons';
import { useLayout } from '../../hooks/useLayout';
import Typo from './Typo';
import TextInput from './TextInput';

type AppScreenHeaderSearchBarProps = {
    searchInputPlaceholder: string;
    query: string;
    showCancelButton: boolean;
    setQuery: (query: string) => void;
    onBlur: () => void;
    onFocus: () => void;
    onSubmit: () => void;
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

const AppScreenHeaderSearchBar: React.FC<AppScreenHeaderSearchBarProps> = ({
    searchInputPlaceholder,
    query,
    showCancelButton,
    setQuery,
    onBlur,
    onFocus,
    onSubmit,
}) => {
    const [{ width: containerWidth }, onContainerLayout] = useLayout();
    const [{ width }, onLayout] = useLayout(true);
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

    function handleTextInputSubmit() {
        onSubmit();
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
                    placeholder={searchInputPlaceholder}
                    sx={{ borderWidth: 0 }}
                    onFocus={handleTextInputFocus}
                    onBlur={handleTextInputBlur}
                    onSubmitEditing={handleTextInputSubmit}
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

export default AppScreenHeaderSearchBar;
