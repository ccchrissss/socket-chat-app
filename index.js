// **********
// console.log('this is BACK END js')
// **********

import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { availableParallelism } from 'node:os';
import cluster from 'node:cluster';
import { createAdapter, setupPrimary } from '@socket.io/cluster-adapter'
import { create } from 'node:domain';
import dotenv from 'dotenv';
dotenv.config({ path: './config/.env' });

// require('dotenv').config({path: './config/.env'})

if (cluster.isPrimary) {
  const numCPUs = availableParallelism()

  // create one worker per available core
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork({
      PORT: 3000 + i 
    })
  }

  // set up the adapter on the primary thread
  setupPrimary()
} else {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    connectionStateRecovery: {},
    // set up the adapter on each worker thread
    adapter: createAdapter()
  });

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
  
    socket.on('unicorn', async (msg, clientOffset, callback) => {
      // console.log('message: ' + msg);
  
      let result
      try {
        // store message in the database
        result = await db.run('INSERT INTO messages (content, client_offset) VALUES (?, ?)', msg, clientOffset)
      } catch (e) {
        // handle the failure
        if (e.errno === 19 /* SQLITE_CONSTRAINT */ ) {
          // the message was already inserted, so we notify the client
          callback()
        } else {
          // nothing to do, just let the client retry
        }
        return;
      }
      // include the offset with the message
      io.emit('chat message', msg, result.lastID)
  
      // acknowledge the event
      callback()
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
  
  
  // each worker will listen on a distinct port
  const port = process.env.PORT
  
  server.listen(port, () => {
    console.log(`server running at http://localhost:${port}`);
  });
}

