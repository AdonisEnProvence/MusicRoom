import Database from '@ioc:Adonis/Lucid/Database';
import { datatype } from 'faker';
import test from 'japa';
import { createMachine, interpret } from 'xstate';
import { initTestUtils } from './utils/TestUtils';

test.group('Connection Acknowledgement', (group) => {
    const {
        disconnectEveryRemainingSocketConnection,
        initSocketConnection,
        createUserAndGetSocketWithoutConnectionAcknowledgement,
    } = initTestUtils();

    group.beforeEach(async () => {
        initSocketConnection();
        await Database.beginGlobalTransaction();
    });

    group.afterEach(async () => {
        await disconnectEveryRemainingSocketConnection();
        await Database.rollbackGlobalTransaction();
    });

    test('Server waits for an event to acknowledge connection when connection has been registered', async (assert) => {
        const senderUserID = datatype.uuid();
        const mtvRoomID = datatype.uuid();

        const socket =
            await createUserAndGetSocketWithoutConnectionAcknowledgement({
                userID: senderUserID,
                mtvRoomIDToAssociate: mtvRoomID,
            });

        const pollConnectionAcknowledgementMachine = createMachine<
            unknown,
            { type: 'CONNECTION_ACKNOWLEDGED' }
        >({
            id: 'pollConnectionAcknowledgement',

            initial: 'fetching',

            states: {
                fetching: {
                    after: {
                        50: {
                            target: 'deboucing',
                        },
                    },

                    invoke: {
                        id: 'fetchingAcknowledgement',

                        src: () => (sendBack) => {
                            socket.emit(
                                'GET_HAS_ACKNOWLEDGED_CONNECTION',
                                () => {
                                    sendBack({
                                        type: 'CONNECTION_ACKNOWLEDGED',
                                    });
                                },
                            );
                        },
                    },

                    on: {
                        CONNECTION_ACKNOWLEDGED: {
                            target: 'connectionIsAcknowledged',
                        },
                    },
                },

                deboucing: {
                    after: {
                        100: {
                            target: 'fetching',
                        },
                    },
                },

                connectionIsAcknowledged: {
                    type: 'final',
                },
            },
        });

        let state = pollConnectionAcknowledgementMachine.initialState;
        const service = interpret(pollConnectionAcknowledgementMachine)
            .onTransition((updatedState) => {
                state = updatedState;
            })
            .start();

        await new Promise((resolve) => {
            service.onDone(resolve);
        });

        assert.isTrue(
            state.matches('connectionIsAcknowledged'),
            'Connection has never been acknowledged',
        );
    });
});
