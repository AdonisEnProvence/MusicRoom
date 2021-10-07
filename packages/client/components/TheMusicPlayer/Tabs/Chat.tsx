import React from 'react';
import { TouchableOpacity } from 'react-native';
import { View, TextInput, useSx } from 'dripsy';
import { Ionicons } from '@expo/vector-icons';

const ChatTab: React.FC = () => {
    const sx = useSx();

    return (
        <View sx={{ flex: 1 }}>
            <View
                sx={{
                    backgroundColor: 'secondary',
                    flex: 1,
                    flexBasis: [undefined, 400],
                }}
            />

            <View
                sx={{
                    flexShrink: 0,
                    paddingTop: 'm',
                    paddingBottom: 'l',

                    flexDirection: 'row',
                    alignItems: 'center',
                }}
            >
                <TextInput
                    placeholder="Write a message..."
                    // FIXME: From Colors.tsx file
                    placeholderTextColor="rgb(149, 150, 156)"
                    sx={{
                        flex: 1,
                        padding: 'm',
                        marginRight: 'm',
                        backgroundColor: 'greyLight',
                        color: 'white',
                        borderRadius: 's',
                    }}
                />

                <TouchableOpacity
                    style={sx({
                        padding: 's',
                    })}
                >
                    <Ionicons name="send" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ChatTab;
