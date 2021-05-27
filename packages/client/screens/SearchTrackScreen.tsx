import { StackScreenProps } from '@react-navigation/stack';
import { useMachine } from '@xstate/react';
import React, { useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
} from 'react-native';

import { RootStackParamList } from '../types';
import { searchTrackMachine } from '../machines/searchTrackMachine';

const SearchTrackScreen: React.FC<
    StackScreenProps<RootStackParamList, 'SearchTrack'>
> = ({ navigation }) => {
    const [state, send] = useMachine(searchTrackMachine);

    useEffect(() => {
        if (
            state.matches('fetchedTracks') &&
            state.context.tracks !== undefined
        ) {
            navigation.navigate('SearchTrackResults', {
                tracks: state.context.tracks,
            });
        }
    }, [state, navigation]);

    function sendQuery() {
        send({
            type: 'SEND_REQUEST',
        });
    }

    function handleInputChangeText(searchQuery: string) {
        send({
            type: 'UPDATE_SEARCH_QUERY',
            searchQuery,
        });
    }

    return (
        <View style={styles.container}>
            <View>
                <Text style={styles.title}>Search a track</Text>

                <View style={styles.searchInputContainer}>
                    <TextInput
                        placeholder="Artists, songs or podcasts"
                        style={styles.searchInput}
                        onChangeText={handleInputChangeText}
                    />

                    <TouchableOpacity
                        style={styles.searchSubmitButton}
                        onPress={sendQuery}
                    >
                        <Text style={styles.searchSubmitButtonText}>✅</Text>
                    </TouchableOpacity>
                </View>

                <Text style={{ marginTop: 40 }}>
                    {state.context.searchQuery}
                </Text>
                <Text style={{ marginTop: 40 }}>{state.value}</Text>
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

    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    },

    searchInput: {
        flex: 1,
        borderColor: 'grey',
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 10,
        fontSize: 16,
        marginRight: 4,
    },

    searchSubmitButton: {
        padding: 12,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
    },

    searchSubmitButtonText: {
        textAlign: 'center',
        fontSize: 18,
    },
});

export default SearchTrackScreen;
