import { assign, createMachine } from 'xstate';

export type AppScreenHeaderWithSearchBarMachineContext = {
    searchQuery: string;
};

export type AppScreenHeaderWithSearchBarMachineEvent =
    | { type: 'SUBMIT' }
    | { type: 'FOCUS' }
    | { type: 'BLUR' }
    | { type: 'UPDATE_SEARCH_QUERY'; searchQuery: string };

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
                                actions: 'setSearchQuery',
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
                                    actions: 'setSearchQuery',
                                },
                                {
                                    actions: 'setSearchQuery',
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
                tags: ['showSearchResults'],

                on: {
                    FOCUS: {
                        target: 'typing',
                    },
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
