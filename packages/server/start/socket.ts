import Ws from 'App/Services/Ws';
import ChatController from 'App/Controllers/Ws/ChatController';

Ws.boot();

interface WsController<WsClass> {
    new (ws: typeof Ws.io): WsClass;
}

// From https://gist.github.com/karol-majewski/ba4c4049e2d8c735fa1910486fd6aba9
type MethodOf<T> = {
    [P in keyof T]: T[P] extends (this: infer U, ...args: unknown[]) => any
        ? U extends T
            ? P
            : never
        : never;
}[keyof T];

function use<WsClass>(
    constructor: WsController<WsClass>,
    method: MethodOf<WsClass>,
): OmitThisParameter<WsClass[MethodOf<WsClass>]> {
    const instance = new constructor(Ws.io);

    const instanceMethod = instance[method];
    return (instanceMethod as any).bind(instance) as WsClass[MethodOf<WsClass>];
}

Ws.io.on('connection', (socket) => {
    use(ChatController, 'onConnect')({ socket, data: undefined });

    socket.on('writeMessage', (data) => {
        use(ChatController, 'onWriteMessage')({ socket, data });
    });
});
