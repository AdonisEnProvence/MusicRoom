import Ws from 'App/Services/Ws';

Ws.boot();

Ws.io.on('connection', (socket) => {
    socket.emit('ack', { message: 'Hello!' });

    socket.on('pong', (data) => {
        console.log('data', data);
    });
});
