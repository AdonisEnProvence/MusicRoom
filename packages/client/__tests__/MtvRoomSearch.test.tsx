import React from 'react';
import {
    fireEvent,
    noop,
    render,
    waitForElementToBeRemoved,
    within,
} from '../tests/tests-utils';
import { NavigationContainer } from '@react-navigation/native';
import { isReadyRef, navigationRef } from '../navigation/RootNavigation';
import { RootNavigator } from '../navigation';
import { db } from '../tests/data';
import { MtvRoomSearchResult } from '@musicroom/types';
import { datatype } from 'faker';

function createSearchableRooms(count: number): MtvRoomSearchResult[] {
    return Array.from({ length: count }).map(() => db.searchableRooms.create());
}

test('Rooms are listed when coming to the screen and infinitely loaded', async () => {
    const rooms = createSearchableRooms(datatype.number({ min: 11, max: 15 }));
    const firstPageRooms = rooms.slice(0, 10);
    const secondPageRooms = rooms.slice(10);

    const screen = render(
        <NavigationContainer
            ref={navigationRef}
            onReady={() => {
                isReadyRef.current = true;
            }}
        >
            <RootNavigator colorScheme="dark" toggleColorScheme={noop} />
        </NavigationContainer>,
    );

    expect(screen.getAllByText(/home/i).length).toBeGreaterThanOrEqual(1);

    const goToMtvSearchScreenButton = screen.getByText(
        /go.*to.*music.*track.*vote/i,
    );
    expect(goToMtvSearchScreenButton).toBeTruthy();

    fireEvent.press(goToMtvSearchScreenButton);

    const searchInput = await screen.findByPlaceholderText(/search.*room/i);
    expect(searchInput).toBeTruthy();

    for (const { roomID, roomName, creatorName, isOpen } of firstPageRooms) {
        const listItem = await screen.findByTestId(`mtv-room-search-${roomID}`);
        expect(listItem).toBeTruthy();

        const roomNameElement = within(listItem).getByText(
            new RegExp(roomName),
        );
        expect(roomNameElement).toBeTruthy();

        const creatorNameElement = within(listItem).getByText(creatorName);
        expect(creatorNameElement).toBeTruthy();

        switch (isOpen) {
            case true: {
                const publicStatusElement =
                    within(listItem).getByText(/public/i);
                expect(publicStatusElement).toBeTruthy();

                break;
            }
            case false: {
                const privateStatusElement =
                    within(listItem).getByText(/private/i);
                expect(privateStatusElement).toBeTruthy();

                break;
            }

            default: {
                throw new Error('Reached unreachable state');
            }
        }
    }

    const mtvRoomsSearchFlatList = screen.getByTestId(
        'mtv-room-search-flat-list',
    );
    expect(mtvRoomsSearchFlatList).toBeTruthy();
    fireEvent(mtvRoomsSearchFlatList, 'endReached');

    await waitForElementToBeRemoved(() => screen.getByText(/load.*more/i));

    for (const { roomID, roomName, creatorName, isOpen } of secondPageRooms) {
        const listItem = await screen.findByTestId(`mtv-room-search-${roomID}`);
        expect(listItem).toBeTruthy();

        const roomNameElement = within(listItem).getByText(
            new RegExp(roomName),
        );
        expect(roomNameElement).toBeTruthy();

        const creatorNameElement = within(listItem).getByText(creatorName);
        expect(creatorNameElement).toBeTruthy();

        switch (isOpen) {
            case true: {
                const publicStatusElement =
                    within(listItem).getByText(/public/i);
                expect(publicStatusElement).toBeTruthy();

                break;
            }
            case false: {
                const privateStatusElement =
                    within(listItem).getByText(/private/i);
                expect(privateStatusElement).toBeTruthy();

                break;
            }

            default: {
                throw new Error('Reached unreachable state');
            }
        }
    }
});

// test.skip('Rooms are filtered and infinitely loaded', async () => {});

// test.skip('Displays empty state when no rooms match the query', async () => {});
