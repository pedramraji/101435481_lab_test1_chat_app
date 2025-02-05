const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const app = express();

// Models
const User = require('./models/User');
const Message = require('./models/Message');

const server = http.createServer(app); 
const io = socketIo(server); 

// MongoDB connection URI
const uri = 'mongodb+srv://pedramraji:1Hyom38guD9JEDXy@cluster0.dxzep.mongodb.net/chat_app?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB Atlas');
}).catch(err => {
  console.log('Error connecting to MongoDB Atlas:', err);
});

app.use(express.static('public'));
app.use(express.json());

// Routes for Signup, Login, Chat, and Rooms
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'signup.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'signup.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Chat page (Dynamic room handling)
app.get('/chat/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'chat.html'));
});

app.get('/chat/:room', (req, res) => {
  const room = req.params.room; 
  res.sendFile(path.join(__dirname, 'views', 'chat.html'));
});

// Signup Logic
app.post('/signup', async (req, res) => {
  const { username, firstname, lastname, password, createdOn } = req.body;
  
  console.log('Signup request body:', req.body);
  
  if (!username || !firstname || !lastname || !password) {
    console.log('Missing required fields');
    return res.status(400).send('All fields are required');
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log('Username already taken');
      return res.status(400).send('Username already taken');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log('Hashed password:', hashedPassword); 
    const newUser = new User({
      username,
      firstname,
      lastname,
      password: hashedPassword,
      createdOn 
    });

    await newUser.save();
    console.log('User signed up successfully'); 
    res.status(201).send('Signup successful');
  } catch (error) {
    console.error('Error during signup:', error); 
    res.status(500).send('Signup failed. Please try again later.');
  }
});

// Login Logic
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  console.log('Received login request:', { username, password });

  const user = await User.findOne({ username });

  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ username: user.username }, 'secret', { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(400).json({ message: 'Invalid credentials' });
  }
});







io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);


  socket.on('joinRoom', async (room) => {
    socket.join(room);
    console.log(`${socket.id} joined room: ${room}`);

    try {

      const messages = await Message.find({ room }).sort({ date_sent: 1 });


      socket.emit('previousMessages', messages);
    } catch (err) {
      console.log('Error fetching messages:', err);
    }
  });

  socket.on('chatMessage', async (msg, room) => {
    console.log(`New message in ${room}:`, msg);

    const newMessage = new Message({
      from_user: msg.from_user,
      room,
      message: msg.message,
      date_sent: new Date(),
    });
    await newMessage.save();

    io.to(room).emit('message', { from_user: msg.from_user, message: msg.message, room });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});








// Start the server
const PORT = process.env.PORT || 80;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
