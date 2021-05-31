import {
    ChatClientToServerEvents,
    ChatServerToClientEvents,
} from '@musicroom/types';
import { useMachine, useSelector } from '@xstate/react';
import React from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { assign, createMachine, send } from 'xstate';
import { SERVER_ENDPOINT } from '../constants/Endpoints';

interface ChatMessage {
    text: string;
    author: string;
}

interface ChatMachineContext {
    currentMessage?: string;

    messages?: ChatMessage[];
}

type ChatMachineEvent =
    | { type: 'CONNECTED_TO_SERVER' }
    | { type: 'LOADED_MESSAGES'; messages: ChatMessage[] }
    | {
          type: 'UPDATE_CURRENT_MESSAGE';
          message: string;
      }
    | { type: 'SEND_MESSAGE' }
    | { type: 'SEND_MESSAGE_TO_SERVER'; message: string }
    | { type: 'RECEIVED_MESSAGE'; message: ChatMessage }
    | { type: 'SUCCESSFULLY_SENT_MESSAGE' };

const chatMachine = createMachine<ChatMachineContext, ChatMachineEvent>({
    context: {
        currentMessage: undefined,

        messages: undefined,
    },

    invoke: {
        id: 'connectionToBackend',
        src: () => (sendBack, onReceive) => {
            const socket: Socket<
                ChatServerToClientEvents,
                ChatClientToServerEvents
            > = io(SERVER_ENDPOINT);

            socket.on('connect', () => {
                sendBack({
                    type: 'CONNECTED_TO_SERVER',
                });
            });

            socket.on('LOAD_MESSAGES', ({ messages }) => {
                sendBack({
                    type: 'LOADED_MESSAGES',
                    messages,
                });
            });

            socket.on('RECEIVED_MESSAGE', ({ message: { author, text } }) => {
                console.log('received message');

                sendBack({
                    type: 'RECEIVED_MESSAGE',
                    message: {
                        author,
                        text,
                    },
                });
            });

            onReceive((event) => {
                console.log('global service received a message');

                switch (event.type) {
                    case 'SEND_MESSAGE_TO_SERVER': {
                        socket.emit('NEW_MESSAGE', {
                            message: {
                                author: 'Baptiste Devessier',
                                text: event.message,
                            },
                        });
                    }
                }
            });

            return () => {
                socket.close();
            };
        },
    },

    initial: 'connectingToServer',

    states: {
        connectingToServer: {
            on: {
                CONNECTED_TO_SERVER: {
                    target: 'loadingMessages',
                },
            },
        },

        loadingMessages: {
            on: {
                LOADED_MESSAGES: {
                    target: 'ready',
                    actions: assign({
                        messages: (_context, event) => event.messages,
                    }),
                },
            },
        },

        ready: {
            type: 'parallel',

            states: {
                writingNewMessage: {
                    initial: 'editingNewMessage',

                    states: {
                        editingNewMessage: {
                            on: {
                                UPDATE_CURRENT_MESSAGE: {
                                    actions: assign({
                                        currentMessage: (_context, event) =>
                                            event.message,
                                    }),
                                },

                                SEND_MESSAGE: {
                                    actions: [
                                        send(
                                            (context) => {
                                                console.log(
                                                    'send message!',
                                                    context,
                                                );

                                                return {
                                                    type: 'SEND_MESSAGE_TO_SERVER',
                                                    message:
                                                        context.currentMessage,
                                                };
                                            },
                                            {
                                                to: 'connectionToBackend',
                                            },
                                        ),
                                    ],
                                },
                            },
                        },
                    },
                },

                listeningToNewMessages: {
                    on: {
                        RECEIVED_MESSAGE: {
                            actions: assign({
                                messages: (context, event) => [
                                    ...(context.messages ?? []),
                                    event.message,
                                ],
                            }),
                        },
                    },
                },
            },
        },
    },
});

const ChatScreen: React.FC = () => {
    const [, send, service] = useMachine(chatMachine);
    const currentMessage = useSelector(
        service,
        (state) => state.context.currentMessage,
    );
    const messages = useSelector(service, (state) => state.context.messages);

    function handleNewMessageChangeText(newMessage: string) {
        send({
            type: 'UPDATE_CURRENT_MESSAGE',
            message: newMessage,
        });
    }

    function handleNewMessageEndEditing() {
        send({
            type: 'SEND_MESSAGE',
        });
    }
    return (
        <View style={styles.container}>
            <View style={{ flex: 1 }}>
                <Text style={styles.title}>Chat</Text>

                {messages !== undefined && (
                    <FlatList
                        data={messages}
                        renderItem={({ item: { author, text }, index }) => (
                            <View
                                style={{
                                    marginBottom:
                                        index < messages.length - 1 ? 6 : 0,
                                }}
                            >
                                <Text>{author}</Text>
                                <Text>{text}</Text>
                            </View>
                        )}
                        keyExtractor={({ author, text }) => `${author}-${text}`}
                        style={{ marginTop: 10 }}
                    />
                )}
            </View>

            <View style={styles.newMessageInputContainer}>
                <TextInput
                    placeholder="Nouveau message"
                    style={styles.newMessageInput}
                    value={currentMessage}
                    onChangeText={handleNewMessageChangeText}
                    onEndEditing={handleNewMessageEndEditing}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 20,
        width: '100%',
    },

    title: {
        fontSize: 22,
        fontWeight: '700',
    },

    newMessageInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 30,
    },

    newMessageInput: {
        flex: 1,
        borderColor: 'grey',
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 10,
        fontSize: 16,
        marginRight: 4,
    },
});

export default ChatScreen;
