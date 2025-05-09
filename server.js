const path = require('path');
const express = require('express');
const app = express();
const socketIO = require('socket.io');

const port = process.env.PORT || 3000; //PORT NUMBER
const env = process.env.NODE_ENV || 'development';

app.get('*', (req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https' && env !== 'development') {
        return res.redirect(['https://', req.get('Host'), req.url].join(''));
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'node_modules')));

const server = require('http').createServer(app);
server.listen(port, () => {
    console.log(`listening on port ${port}`);
});

//socket.io event
const io = socketIO(server);
io.sockets.on('connection', function (socket) {

    function log() {
        const array = ['Server:'];
        array.push.apply(array, arguments);
        socket.emit('log', array);
    }

   //CHAT BOX
    socket.on('chat message', (msg) => {
        io.emit('chat message', msg);
    });

    socket.on('message', (message, toId = null, room = null) => {
        log('Client ' + socket.id + ' said: ', message);

        if (toId) {
            console.log('From ', socket.id, ' to ', toId, message.type);

            io.to(toId).emit('message', message, socket.id);
        } else if (room) {
            console.log('From ', socket.id, ' to room: ', room, message.type);

            socket.broadcast.to(room).emit('message', message, socket.id);
        } else {
            console.log('From ', socket.id, ' to everyone ', message.type);

            socket.broadcast.emit('message', message, socket.id);
        }
    });

    let roomAdmin;

//room creation/join
    socket.on('create or join', (room) => {
        log('Create or Join room: ' + room);
        const clientsInRoom = io.sockets.adapter.rooms.get(room);
        let numClients = clientsInRoom ? clientsInRoom.size : 0;

        //if no one is in that room number, it gets created, otherwise you join
        if (numClients === 0) {
            // Create room
            socket.join(room);
            roomAdmin = socket.id;
            socket.emit('created', room, socket.id);
        } else {
            log('Client ' + socket.id + ' joined room ' + room);

            // Join room
            io.sockets.in(room).emit('join', room); 
            socket.join(room);
            io.to(socket.id).emit('joined', room, socket.id); 
            io.sockets.in(room).emit('ready', socket.id); 
        }
    });

//kick
    socket.on('kickout', (socketId, room) => {
        if (socket.id === roomAdmin) {
            socket.broadcast.emit('kickout', socketId);
            io.sockets.sockets.get(socketId).leave(room);
        } else {
            console.log('not an admin');
        }
    });

    // leave
    socket.on('leave room', (room) => {
        socket.leave(room);
        socket.emit('left room', room);
        socket.broadcast.to(room).emit('message', { type: 'leave' }, socket.id);
    });

    //show someone left
    socket.on('disconnecting', () => {
        socket.rooms.forEach((room) => {
            if (room === socket.id) return;
            socket.broadcast
                .to(room)
                .emit('message', { type: 'leave' }, socket.id);
        });
    });
});
