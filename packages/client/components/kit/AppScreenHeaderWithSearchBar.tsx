import React, { useEffect } from 'react';
import { useSx, View } from 'dripsy';
import { View as MotiView } from 'moti';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Sender } from '@xstate/react/lib/types';
import { useLayout } from '../../hooks/useLayout';
import { AppScreenHeaderWithSearchBarMachineEvent } from '../../machines/appScreenHeaderWithSearchBarMachine';
import { GLOBAL_THEME_CONSTANTS } from '../../hooks/useTheme';
import AppScreenHeaderTitle from './AppScreenHeaderTitle';
import AppScreenHeaderSearchBar from './AppScreenHeaderSearchBar';

type AppScreenHeaderWithSearchBarPropsBase = {
    insetTop: number;
    setScreenOffsetY: (offset: number) => void;
    title: string;
    searchInputPlaceholder: string;
    showHeader: boolean;
    searchQuery: string;
    sendToMachine: Sender<AppScreenHeaderWithSearchBarMachineEvent>;
};

type AppScreenHeaderWithSearchBarProps = AppScreenHeaderWithSearchBarPropsBase &
    (
        | {
              canGoBack: true;
              goBack: () => void;
          }
        | { canGoBack?: false }
    );

const AppScreenHeaderWithSearchBar: React.FC<AppScreenHeaderWithSearchBarProps> =
    ({
        insetTop,
        setScreenOffsetY,
        showHeader,
        title,
        searchInputPlaceholder,
        searchQuery,
        sendToMachine,
        ...props
    }) => {
        const [{ height }, onLayout] = useLayout();
        const sx = useSx();
        const titleMarginBottom = GLOBAL_THEME_CONSTANTS.space.l;

        useEffect(() => {
            setScreenOffsetY(-height - titleMarginBottom);
        }, [setScreenOffsetY, height, titleMarginBottom]);

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

        function handleTextInputSubmit() {
            sendToMachine({
                type: 'SUBMIT',
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
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: 'l',
                            paddingTop: 'm',
                        })}
                        onLayout={onLayout}
                    >
                        {props.canGoBack === true && (
                            <TouchableOpacity
                                onPress={props.goBack}
                                style={sx({
                                    marginRight: 'l',
                                })}
                            >
                                <Ionicons
                                    name="chevron-back"
                                    style={sx({
                                        fontSize: 'l',
                                        color: 'white',
                                    })}
                                />
                            </TouchableOpacity>
                        )}

                        <AppScreenHeaderTitle>{title}</AppScreenHeaderTitle>
                    </MotiView>

                    <View sx={{ flexDirection: 'row' }}>
                        <AppScreenHeaderSearchBar
                            searchInputPlaceholder={searchInputPlaceholder}
                            query={searchQuery}
                            showInputActions={showHeader === false}
                            setQuery={handleUpdateSearchQuery}
                            onFocus={handleTextInputFocus}
                            onBlur={handleTextInputBlur}
                            onSubmit={handleTextInputSubmit}
                        />
                    </View>
                </View>
            </View>
        );
    };

export default AppScreenHeaderWithSearchBar;
