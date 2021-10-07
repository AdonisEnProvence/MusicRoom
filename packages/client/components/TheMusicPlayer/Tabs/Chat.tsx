import React, { useState } from 'react';
import { TouchableOpacity, FlatList } from 'react-native';
import { View, TextInput, useSx, Text } from 'dripsy';
import { Ionicons } from '@expo/vector-icons';
import { datatype, internet, lorem } from 'faker';

const ChatTab: React.FC = () => {
    const sx = useSx();
    const [messages, setMessages] = useState<
        {
            content: string;
            creatorName: string;
            isMyMessage: boolean;
        }[]
    >([
        {
            content: `1 ${lorem.sentences()}`,
            creatorName: internet.userName(),
            isMyMessage: datatype.boolean(),
        },
        {
            content: lorem.sentences(),
            creatorName: internet.userName(),
            isMyMessage: datatype.boolean(),
        },
        {
            content: lorem.sentences(),
            creatorName: internet.userName(),
            isMyMessage: datatype.boolean(),
        },
        {
            content: lorem.sentences(),
            creatorName: internet.userName(),
            isMyMessage: datatype.boolean(),
        },
        {
            content: lorem.sentences(),
            creatorName: internet.userName(),
            isMyMessage: datatype.boolean(),
        },
        {
            content: lorem.sentences(),
            creatorName: internet.userName(),
            isMyMessage: datatype.boolean(),
        },
        {
            content: lorem.sentences(),
            creatorName: internet.userName(),
            isMyMessage: datatype.boolean(),
        },
        {
            content: lorem.sentences(),
            creatorName: internet.userName(),
            isMyMessage: datatype.boolean(),
        },
    ]);
    const [message, setMessage] = useState('');

    function handleMessageSubmit() {
        if (message === '') {
            return;
        }

        setMessages((messages) => [
            {
                content: message,
                creatorName: internet.userName(),
                isMyMessage: true,
            },
            ...messages,
        ]);

        setMessage('');
    }

    return (
        <View sx={{ flex: 1 }}>
            <View
                sx={{
                    flexGrow: [1, undefined],
                    height: [undefined, 400],
                }}
            >
                <FlatList
                    data={messages}
                    inverted
                    renderItem={({
                        item: { content, creatorName, isMyMessage },
                        index,
                    }) => {
                        const isFirstItem = index === 0;
                        const isNotFirstItem = !isFirstItem;
                        const isNotMyMessage = !isMyMessage;

                        return (
                            <View
                                sx={{
                                    alignItems: isMyMessage
                                        ? 'flex-end'
                                        : 'flex-start',
                                    marginBottom: isNotFirstItem
                                        ? 'l'
                                        : undefined,
                                }}
                            >
                                {isNotMyMessage && (
                                    <Text
                                        sx={{
                                            color: 'greyLighter',
                                            marginBottom: 's',
                                            fontSize: 'xxs',
                                        }}
                                    >
                                        {creatorName}
                                    </Text>
                                )}

                                <View
                                    sx={{
                                        borderRadius: 's',
                                        padding: 'm',
                                        backgroundColor: 'greyLight',
                                        maxWidth: '80%',
                                    }}
                                >
                                    <Text sx={{ color: 'white' }}>
                                        {content}
                                    </Text>
                                </View>
                            </View>
                        );
                    }}
                    keyExtractor={({ content }) => content}
                    style={sx({
                        flex: 1,
                    })}
                />
            </View>

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
                    value={message}
                    onChangeText={setMessage}
                    onSubmitEditing={handleMessageSubmit}
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
                    accessibilityLabel="Send message"
                    onPress={handleMessageSubmit}
                >
                    <Ionicons name="send" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ChatTab;
