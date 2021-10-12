import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import { MusicTrackVoteChatModalProps } from '../types';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import {
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
    TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MtvRoomChatMessage, normalizeChatMessage } from '@musicroom/types';
import { useMachine } from '@xstate/react';
import { Text, TextInput, useSx, View } from 'dripsy';
import { createModel } from 'xstate/lib/model';

const chatModel = createModel(
    {
        previousMessage: '',
        normalizedMessage: '',
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
                    normalizedMessage: (_, { message }) =>
                        normalizeChatMessage(message),
                }),
            },

            SEND: [
                {
                    cond: 'isNormalizedMessageNotEmpty',

                    actions: [
                        chatModel.assign({
                            previousMessage: ({ normalizedMessage }) =>
                                normalizedMessage,
                            message: '',
                            normalizedMessage: '',
                        }),

                        'forwardMessage',
                    ],
                },

                {
                    actions: chatModel.reset(),
                },
            ],
        },
    },
    {
        guards: {
            isNormalizedMessageNotEmpty: ({ normalizedMessage }) =>
                normalizedMessage.length > 0,
        },
    },
);

interface ChatViewProps {
    goBack: () => void;
    messages: MtvRoomChatMessage[];
    currentUserID: string;
    currentMessage: string;
    setCurrentMessage: (message: string) => void;
    onSubmitEditing: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({
    goBack,
    messages,
    currentUserID,
    currentMessage,
    setCurrentMessage,
    onSubmitEditing,
}) => {
    const insets = useSafeAreaInsets();
    const sx = useSx();

    return (
        <AppScreen testID="mtv-chat-screen">
            <AppScreenHeader
                title="Chat"
                insetTop={insets.top}
                canGoBack
                goBack={goBack}
            />

            <AppScreenContainer>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    // The height of the screen header.
                    // Not accurate on Android.
                    keyboardVerticalOffset={100}
                    style={sx({
                        flex: 1,
                        width: ['auto', '70%'],
                        marginX: [0, 'auto'],
                    })}
                >
                    <View sx={{ flex: 1, paddingBottom: insets.bottom }}>
                        <View
                            sx={{
                                flex: 1,
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
                                    const isMyMessage =
                                        authorID === currentUserID;
                                    const isNotMyMessage = !isMyMessage;

                                    return (
                                        <TouchableWithoutFeedback
                                            onPress={Keyboard.dismiss}
                                        >
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
                                                        backgroundColor:
                                                            'greyLight',
                                                        maxWidth: '80%',
                                                    }}
                                                >
                                                    <Text
                                                        sx={{ color: 'white' }}
                                                    >
                                                        {text}
                                                    </Text>
                                                </View>
                                            </View>
                                        </TouchableWithoutFeedback>
                                    );
                                }}
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
                                value={currentMessage}
                                onChangeText={setCurrentMessage}
                                onSubmitEditing={onSubmitEditing}
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
                                onPress={onSubmitEditing}
                            >
                                <Ionicons name="send" size={20} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </AppScreenContainer>
        </AppScreen>
    );
};

const MusicTrackVoteChatModal: React.FC<MusicTrackVoteChatModalProps> = ({
    navigation,
}) => {
    const { state: mtvState, sendToMachine: mtvSend } = useMusicPlayer();
    const currentUserID = mtvState.context.userRelatedInformation?.userID ?? '';
    const messages = mtvState.context.chatMessages ?? [];
    const [state, send] = useMachine(chatMachine, {
        actions: {
            forwardMessage: ({ previousMessage }) => {
                forwardMessageToMtvMachine(previousMessage);
            },
        },
    });

    function forwardMessageToMtvMachine(message: string) {
        mtvSend({
            type: 'SEND_CHAT_MESSAGE',
            message,
        });
    }

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

    function handleGoBack() {
        navigation.goBack();
    }

    return (
        <ChatView
            goBack={handleGoBack}
            currentUserID={currentUserID}
            messages={messages}
            currentMessage={state.context.message}
            setCurrentMessage={handleMessageOnChange}
            onSubmitEditing={handleMessageSubmit}
        />
    );
};

export default MusicTrackVoteChatModal;
