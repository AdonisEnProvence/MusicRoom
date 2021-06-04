import React, { useEffect } from 'react';
import { useSx, View } from 'dripsy';
import { View as MotiView } from 'moti';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppScreenHeaderTitle from './AppScreenHeaderTitle';
import { useLayout } from '../../hooks/useLayout';
import AppScreenHeaderSearchBar from './AppScreenHeaderSearchBar';
import { Sender } from 'xstate';
import { AppScreenHeaderWithSearchBarMachineEvent } from '../../machines/appScreenHeaderWithSearchBarMachine';

type AppScreenHeaderWithSearchBarPropsBase = {
    insetTop: number;
    setScreenOffsetY: (offset: number) => void;

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
        searchQuery,
        sendToMachine,
        ...props
    }) => {
        const [{ height }, onLayout] = useLayout();
        const sx = useSx();
        const titleMarginBottom = sx({ marginBottom: 'l' })
            .marginBottom as number;

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

                        <AppScreenHeaderTitle>Track vote</AppScreenHeaderTitle>
                    </MotiView>

                    <View sx={{ flexDirection: 'row' }}>
                        <AppScreenHeaderSearchBar
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

export default AppScreenHeaderWithSearchBar;
