import { StackScreenProps } from '@react-navigation/stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { RootStackParamList } from '../types';

const SearchTrackResultsScreen: React.FC<
    StackScreenProps<RootStackParamList, 'SearchTrack'>
> = () => {
    return (
        <View style={styles.container}>
            <Text>Results</Text>
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

export default SearchTrackResultsScreen;
