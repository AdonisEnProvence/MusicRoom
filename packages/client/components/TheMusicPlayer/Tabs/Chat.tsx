import { Ionicons } from '@expo/vector-icons';
import { MtvRoomChatMessage } from '@musicroom/types';
import { useMachine } from '@xstate/react';
import { Text, TextInput, useSx, View } from 'dripsy';
import React from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import { createModel } from 'xstate/lib/model';

interface ChatTabProps {
    currentUserID: string;
    messages?: MtvRoomChatMessage[];
    sendMessage: (message: string) => void;
}

const chatModel = createModel(
    {
        previousMessage: '',
        message: '',
    },
    {
        events: {
            SET_MESSAGE: (message: string) => ({ message }),

            SEND: () => ({}),
        },
    },
);

const chatMachine = chatModel.createMachine(
    {
        context: chatModel.initialContext,

        on: {
            SET_MESSAGE: {
                actions: chatModel.assign({
                    message: (_, { message }) => message,
                }),
            },

            SEND: {
                cond: 'isMessageNotEmpty',

                actions: [
                    chatModel.assign({
                        previousMessage: ({ message }) => message,
                        message: '',
                    }),

                    'forwardMessage',
                ],
            },
        },
    },
    {
        guards: {
            isMessageNotEmpty: ({ message }) => message.length > 0,
        },
    },
);

const ChatTab: React.FC<ChatTabProps> = ({
    currentUserID,
    messages,
    sendMessage,
}) => {
    const sx = useSx();
    const [state, send] = useMachine(chatMachine, {
        actions: {
            forwardMessage: ({ previousMessage }) => {
                sendMessage(previousMessage);
            },
        },
    });

    function handleMessageSubmit() {
        send({
            type: 'SEND',
        });
    }

    function handleMessageOnChange(message: string) {
        send({
            type: 'SET_MESSAGE',
            message,
        });
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
                        item: { text, authorID, authorName },
                        index,
                    }) => {
                        const isFirstItem = index === 0;
                        const isNotFirstItem = !isFirstItem;
                        const isMyMessage = authorID === currentUserID;
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
                                        {authorName}
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
                                    <Text sx={{ color: 'white' }}>{text}</Text>
                                </View>
                            </View>
                        );
                    }}
                    keyExtractor={({ text }) => text}
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
                    value={state.context.message}
                    onChangeText={handleMessageOnChange}
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
