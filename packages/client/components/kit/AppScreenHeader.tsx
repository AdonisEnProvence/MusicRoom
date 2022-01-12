import React from 'react';
import { useSx, View } from 'dripsy';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppScreenHeaderTitle from './AppScreenHeaderTitle';

type AppScreenHeaderPropsBase = {
    insetTop: number;
    title: string;
    HeaderRight?: () => React.ReactElement;
};

type AppScreenHeaderProps = AppScreenHeaderPropsBase &
    (
        | {
              canGoBack: true;
              goBack: () => void;
          }
        | { canGoBack?: false }
    );

const AppScreenHeader: React.FC<AppScreenHeaderProps> = ({
    insetTop,
    title,
    HeaderRight,
    ...props
}) => {
    const sx = useSx();

    return (
        <View
            sx={{
                paddingTop: insetTop,
                paddingLeft: 'l',
                paddingRight: 'l',
            }}
        >
            <View
                sx={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 'l',
                    paddingTop: 'm',
                }}
            >
                {props.canGoBack === true && (
                    <TouchableOpacity
                        accessibilityLabel="Go back"
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

                {HeaderRight && <HeaderRight />}

                <AppScreenHeaderTitle>{title}</AppScreenHeaderTitle>
            </View>
        </View>
    );
};

export default AppScreenHeader;
