import express from 'express';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, '')));
const PASSWORD = 'kerrigan';
let userList = {};
let roomList = {};

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('check password', (password, callback) => {
    if (password === PASSWORD) {
      callback(true);
    } else {
      callback(false);
      socket.disconnect();
    }
  });

  socket.on('set username', (username, callback) => {
    userList[socket.id] = username;
    console.log(`${username} has joined the chat.`);
    callback();
    updateUsersList(socket, roomList[socket.id]);
  });

  socket.on('join room', (newRoom, oldRoom, callback) => {
    socket.leave(oldRoom);
    socket.join(newRoom);
    roomList[socket.id] = newRoom;
    console.log(`${userList[socket.id]} moved to room ${newRoom}`);
    callback();
    updateUsersList(socket, newRoom);
  });

  socket.on('typing', ({room, user}) => {
    socket.to(room).emit('display typing', user);
  });

  socket.on('stop typing', (room) => {
    socket.to(room).emit('hide typing');
  });

  socket.on('chat message', (msg, room) => {
    const timestamp = new Date();
    const formattedTime = timestamp.toTimeString().split(" ")[0];
    io.to(room).emit('chat message', `${formattedTime} ${userList[socket.id]}: ${msg}`);
    console.log(`Message received: ${msg} from ${socket.id} in room ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`${userList[socket.id] || 'A user'} has left the chat.`);
    delete userList[socket.id];
    let room = roomList[socket.id];
    delete roomList[socket.id];
    updateUsersList(socket, room);
  });

  function updateUsersList(socket, room) {
    let usersInRoom = Object.keys(userList).filter(id => roomList[id] === room).map(id => userList[id]);
    io.to(room).emit('users list', usersInRoom);
  }  
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
