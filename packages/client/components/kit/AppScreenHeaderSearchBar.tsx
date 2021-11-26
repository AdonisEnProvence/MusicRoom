import React, { useRef } from 'react';
import { TextInput as RNTextInput, TouchableOpacity } from 'react-native';
import { View as MotiView } from 'moti';
import { useSx, View } from 'dripsy';
import { Ionicons } from '@expo/vector-icons';
import { useLayout } from '../../hooks/useLayout';
import { GLOBAL_THEME_CONSTANTS } from '../../hooks/useTheme';
import Typo from './Typo';
import TextField from './TextField';

type AppScreenHeaderSearchBarProps = {
    searchInputPlaceholder: string;
    query: string;
    showInputActions: boolean;
    setQuery: (query: string) => void;
    onClearQuery: () => void;
    onCancel: () => void;
    onFocus: () => void;
    onSubmit: () => void;
};

const AppScreenHeaderSearchBar: React.FC<AppScreenHeaderSearchBarProps> = ({
    searchInputPlaceholder,
    query,
    showInputActions,
    setQuery,
    onClearQuery,
    onCancel,
    onFocus,
    onSubmit,
}) => {
    const [{ width: containerWidth }, onContainerLayout] = useLayout();
    const [{ width }, onLayout] = useLayout(true);
    const textInputRef = useRef<RNTextInput | null>(null);
    const sx = useSx();

    const cancelButtonLeftMargin = GLOBAL_THEME_CONSTANTS.space.l;

    return (
        <View
            sx={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}
            onLayout={onContainerLayout}
        >
            <MotiView
                animate={{
                    width: showInputActions
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

                <TextField
                    ref={(input: unknown) => {
                        // @ts-expect-error we could not find a way to use our TextInput component in a ref
                        textInputRef.current = input;
                    }}
                    placeholderTextColor="white"
                    value={query}
                    onChangeText={setQuery}
                    placeholder={searchInputPlaceholder}
                    sx={{ flex: 1, borderWidth: 0 }}
                    onFocus={onFocus}
                    onSubmitEditing={onSubmit}
                />

                {showInputActions && query.length > 0 && (
                    <TouchableOpacity
                        accessibilityLabel="Clear search input"
                        onPress={onClearQuery}
                    >
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
                    opacity: showInputActions ? 1 : 0,
                }}
            >
                <TouchableOpacity
                    style={{
                        marginLeft: cancelButtonLeftMargin,
                    }}
                    onLayout={onLayout}
                    onPress={onCancel}
                >
                    <Typo sx={{ fontSize: 's' }}>Cancel</Typo>
                </TouchableOpacity>
            </MotiView>
        </View>
    );
};

export default AppScreenHeaderSearchBar;
