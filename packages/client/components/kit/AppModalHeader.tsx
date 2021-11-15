import React from 'react';
import { useSx, View } from 'dripsy';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type AppModalHeaderProps = {
    insetTop: number;
    dismiss: () => void;
    HeaderLeft: () => React.ReactElement;
};

const AppModalHeader: React.FC<AppModalHeaderProps> = ({
    insetTop,
    HeaderLeft,
    dismiss,
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
                <HeaderLeft />

                <TouchableOpacity
                    style={sx({
                        padding: 's',
                        borderRadius: 'full',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        marginLeft: 'xl',
                    })}
                    accessibilityLabel={'Minimize the music player'}
                    onPress={dismiss}
                >
                    <Ionicons
                        name="chevron-down"
                        style={sx({
                            fontSize: 'm',
                            color: 'white',
                        })}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default AppModalHeader;
