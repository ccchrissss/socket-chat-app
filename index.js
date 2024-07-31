import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// **********
// console.log('this is BACK END js')
// **********
const db = await open({
  filename: 'chat.db',
  driver: sqlite3.Database
})

await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_offset TEXT UNIQUE,
      content TEXT
  );
`)

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {}
});

const __dirname = dirname(fileURLToPath(import.meta.url));

// send INDEX.HTML file
// app.get('/', (req, res) => {
//   res.sendFile(join(__dirname, 'index.html'));
// });

// render INDEX.EJS FILE
app.get('/', (req, res) => {
  res.render(join(__dirname, 'index.ejs'));
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
  // socket joins a specific room
  // server broadcasts to a specific room, emitting the 'room greeting' event with an argument of 'room of requirement'
  // server emits the event 'hello' with an argument of 'world'
  // server emits the event 'good morning' with arguments of 'buenos dias', 'buongiorno', 'bonjour'
  // when socket receives the event 'unicorn', do this: 
    // server (io) emits the event 'chat message'
  // when socket receives the event 'dragon', do this:
    // server emits the event 'dragon scroll' 
io.on('connection', async socket => {


  // create serverside logic so when randomRoomBtn is clicked, socket.joins a random room, or when existingRoomBtn is clicked, socket.joins the specific inputted room
  socket.join('room-of-requirement')

  io.to('room-of-requirement').emit('room greeting', 'room of requirement')

  io.emit('hello', 'world')

  io.emit('good morning', 'buenos dias', 'buongiorno', 'bonjour')

  socket.on('unicorn', async msg => {
    // console.log('message: ' + msg);

    let result
    try {
      // store message in the database
      result = await db.run('INSERT INTO messages (content) VALUES (?)', msg)
    } catch (e) {
      // TODO handle the failure
      return;
    }
    // include the offset with the message
    io.emit('chat message', msg, result.lastID)
  });

  if (!socket.recovered) {
    // if the connection state recovery was not successful
    try {
      await db.each('SELECT id, content FROM messages WHERE id > ?',
        [socket.handshake.auth.serverOffset || 0],
        (_err, row) => {
          socket.emit('chat message', row.content, row.id)
        }
      )
    } catch (e) {
    // something went wrong
    }
  }
  
  socket.on('dragon', secretMessage => {
    io.emit('dragon scroll', secretMessage)
  })
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
