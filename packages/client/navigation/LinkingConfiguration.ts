/**
 * Learn more about deep linking with React Navigation
 * https://reactnavigation.org/docs/deep-linking
 * https://reactnavigation.org/docs/configuring-links
 */

import * as Linking from 'expo-linking';

export default {
    prefixes: [Linking.makeUrl('/')],
    config: {
        screens: {
            initialRouteName: 'Root',
            Root: {
                initialRouteName: 'Home',
                screens: {
                    Home: {
                        screens: {
                            HomeScreen: 'home',
                        },
                    },
                    SearchTracks: {
                        screens: {
                            SearchTracksScreen: 'searchTracks',
                        },
                    },
                },
            },
            SearchTrackResults: 'searchTrackResults/:tracks',
            TrackPlayer: 'trackPlayer/:track',
            Settings: 'settings/:id',
            NotFound: '*',
        },
    },
};
