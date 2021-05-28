import React from 'react';
import {
    FlatList,
    GestureResponderEvent,
    ListRenderItem,
    TouchableOpacity,
} from 'react-native';

interface MSFlatListProps<ItemT> {
    data: ItemT[];
    onPress?: (event: GestureResponderEvent) => void | (() => void);
    Item: (item: ItemT) => JSX.Element;
}

function MSFlatList<ItemT extends { id: string }>({
    data,
    onPress,
    Item,
}: MSFlatListProps<ItemT>): JSX.Element {
    const renderItem: ListRenderItem<ItemT> = (data) => {
        const item = Item(data.item);
        return onPress ? (
            <TouchableOpacity
                key={'touchableOpacity-' + data.item.id}
                onPress={onPress}
            >
                {item}
            </TouchableOpacity>
        ) : (
            item
        );
    };
    return (
        <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
        />
    );
}

export default MSFlatList;
