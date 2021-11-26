import { createModel } from 'xstate/lib/model';
import { assign, EventFrom, sendParent, State } from 'xstate';

export type AppScreenHeaderWithSearchBarMachineContext = {
    searchQuery: string;
};

const appcreenHeaderWithSearchBarModel = createModel(
    {
        searchQuery: '',
    },
    {
        events: {
            SUBMIT: () => ({}),
            FOCUS: () => ({}),
            UPDATE_SEARCH_QUERY: (searchQuery: string) => ({ searchQuery }),
            SUBMITTED: (searchQuery: string) => ({ searchQuery }),
            CLEAR_QUERY: () => ({}),
            CANCEL: () => ({}),

            RESET: () => ({}),
        },
    },
);

export type AppScreenHeaderWithSearchBarMachineEvent = EventFrom<
    typeof appcreenHeaderWithSearchBarModel
>;

export const appScreenHeaderWithSearchBarMachine =
    appcreenHeaderWithSearchBarModel.createMachine(
        {
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
                            tags: [
                                'showSuggestions',
                                'reduceSuggestionsOpacity',
                            ],

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
                        SUBMIT: {
                            actions: sendParent((context, _event) => ({
                                type: 'SUBMITTED',
                                searchQuery: context.searchQuery,
                            })),
                        },

                        CLEAR_QUERY: {
                            target: '.waitingSearchQuery',

                            actions: [
                                appcreenHeaderWithSearchBarModel.assign({
                                    searchQuery: '',
                                }),

                                'sendSubmittedEventToParentWithEmptySearchQuery',
                            ],
                        },

                        CANCEL: {
                            target: 'idle',

                            actions: [
                                appcreenHeaderWithSearchBarModel.assign({
                                    searchQuery: '',
                                }),

                                'sendSubmittedEventToParentWithEmptySearchQuery',
                            ],
                        },
                    },
                },
            },

            on: {
                RESET: {
                    target: 'idle',

                    actions: appcreenHeaderWithSearchBarModel.reset(),
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

                sendSubmittedEventToParentWithEmptySearchQuery: sendParent({
                    type: 'SUBMITTED',
                    searchQuery: '',
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
