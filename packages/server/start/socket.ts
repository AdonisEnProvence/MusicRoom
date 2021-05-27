import Ws from 'App/Services/Ws';

Ws.boot();

interface Message {
    author: string;
    text: string;
}

const messages: Message[] = [
    {
        author: 'Baptiste Devessier',
        text: 'Hey all!',
    },
];

Ws.io.on('connection', (socket) => {
    console.log('new connection');

    socket.emit('loadMessages', { messages });

    socket.on('writeMessage', ({ message }) => {
        const newChatMessage: Message = {
            author: 'Baptiste Devessier',
            text: message,
        };

        console.log('add message and broadcast it');

        messages.push(newChatMessage);

        Ws.io.emit('receivedMessage', newChatMessage);
    });
});
