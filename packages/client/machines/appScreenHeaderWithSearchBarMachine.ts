import { assign, createMachine, sendParent, State } from 'xstate';

export type AppScreenHeaderWithSearchBarMachineContext = {
    searchQuery: string;
};

export type AppScreenHeaderWithSearchBarMachineEvent =
    | { type: 'SUBMIT' }
    | { type: 'FOCUS' }
    | { type: 'BLUR' }
    | { type: 'UPDATE_SEARCH_QUERY'; searchQuery: string }
    | { type: 'SUBMITTED'; searchQuery: string };

export const appScreenHeaderWithSearchBarMachine = createMachine<
    AppScreenHeaderWithSearchBarMachineContext,
    AppScreenHeaderWithSearchBarMachineEvent
>(
    {
        context: {
            searchQuery: '',
        },

        initial: 'idle',

        states: {
            idle: {
                tags: ['showHeaderTitle', 'showSuggestions'],

                on: {
                    FOCUS: {
                        target: 'typing',
                    },
                },
            },

            typing: {
                initial: 'waitingSearchQuery',

                states: {
                    waitingSearchQuery: {
                        tags: ['showSuggestions', 'reduceSuggestionsOpacity'],

                        on: {
                            UPDATE_SEARCH_QUERY: {
                                target: 'editingSearchQuery',

                                actions: [
                                    'setSearchQuery',
                                    'sendSearchQueryToParent',
                                ],
                            },
                        },
                    },

                    editingSearchQuery: {
                        tags: ['showClearButton', 'showSearchResults'],

                        on: {
                            UPDATE_SEARCH_QUERY: [
                                {
                                    cond: 'isSearchQueryEmptyFromEvent',

                                    target: 'waitingSearchQuery',

                                    actions: [
                                        'setSearchQuery',
                                        'sendSearchQueryToParent',
                                    ],
                                },

                                {
                                    actions: [
                                        'setSearchQuery',
                                        'sendSearchQueryToParent',
                                    ],
                                },
                            ],
                        },
                    },
                },

                on: {
                    SUBMIT: 'submitted',

                    BLUR: 'idle',
                },
            },

            submitted: {
                entry: sendParent((context, _event) => ({
                    type: 'SUBMITTED',
                    searchQuery: context.searchQuery,
                })),

                tags: ['showSearchResults'],

                on: {
                    FOCUS: {
                        target: 'typing',
                    },

                    BLUR: 'idle',
                },
            },
        },
    },
    {
        actions: {
            setSearchQuery: assign((context, event) => {
                if (event.type !== 'UPDATE_SEARCH_QUERY') {
                    return context;
                }

                return {
                    ...context,
                    searchQuery: event.searchQuery,
                };
            }),

            sendSearchQueryToParent: sendParent((_, event) => {
                if (event.type !== 'UPDATE_SEARCH_QUERY') {
                    throw new Error(
                        'sendSearchQueryToParent must only be called in response to a UPDATE_SEARCH_QUERY event',
                    );
                }

                return {
                    type: 'UPDATE_SEARCH_QUERY',
                    searchQuery: event.searchQuery,
                };
            }),
        },

        guards: {
            isSearchQueryEmptyFromEvent: (_context, event): boolean => {
                if (event.type !== 'UPDATE_SEARCH_QUERY') {
                    return true;
                }

                return event.searchQuery.length === 0;
            },
        },
    },
);

export type AppScreenHeaderWithSearchBarMachineState = State<
    AppScreenHeaderWithSearchBarMachineContext,
    AppScreenHeaderWithSearchBarMachineEvent
>;
