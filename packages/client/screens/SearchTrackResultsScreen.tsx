import { StackScreenProps } from '@react-navigation/stack';
import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    ListRenderItem,
    TouchableOpacity,
} from 'react-native';
import { SearchedTrack } from '../machines/searchTrackMachine';

import { RootStackParamList } from '../types';

const Item = ({ title }: SearchedTrack) => (
    <View style={styles.track}>
        <Text style={styles.title}>{title || 'yes'}</Text>
    </View>
);

const SearchTrackResultsScreen: React.FC<
    StackScreenProps<RootStackParamList, 'SearchTrackResults'>
> = ({ route, navigation }) => {
    const { tracks } = route.params;

    const renderTrack: ListRenderItem<SearchedTrack> = (data) => {
        console.log(data);
        const { id, title } = data.item;
        return (
            <TouchableOpacity
                key={'touchableOpacity-' + id}
                onPress={() => {
                    navigation.navigate('TrackPlayer', {
                        track: data.item,
                    });
                }}
            >
                <Item id={id} title={title} />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Text>Results</Text>
            <FlatList
                data={tracks}
                renderItem={renderTrack}
                keyExtractor={(track) => track.id}
            />
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

    track: {
        backgroundColor: '#f9c2ff',
        padding: 20,
        marginVertical: 8,
        marginHorizontal: 16,
    },
    title: {
        fontSize: 32,
    },
});

export default SearchTrackResultsScreen;
