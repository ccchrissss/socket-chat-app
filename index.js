import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';

// **********
// console.log('this is BACK END js')
// **********

const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

// when the server receives the event 'connection', do this:
  // console.log the string 'a user connected'
  // when the socket receives the event 'disconnect', do this:
    // console.log the string 'user disconnected'
io.on('connection', socket => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// when the server receives the event 'connection', do this:
  // when socket receives the event 'unicorn', do this: 
    // server (io) emits the event 'chat message'
  // when socket receives the event 'dragon', do this:
    // server emits the event 'dragon scroll' 
io.on('connection', socket => {
  socket.on('unicorn', msg => {
    // console.log('message: ' + msg);
    io.emit('chat message', msg)
  });
  socket.on('dragon', secretMessage => {
    io.emit('dragon scroll', secretMessage)
  })
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
