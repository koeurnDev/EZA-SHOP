require('dotenv').config();
const express = require('express');
const { verifyUser } = require('./middleware/auth');
const userController = require('./controllers/userController');

const app = express();
app.use(express.json());
app.put('/api/user/profile', verifyUser, userController.updateProfile);

const server = app.listen(3006, async () => {
  console.log("Server listening on 3006");
  try {
    const res = await fetch('http://localhost:3006/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-TG-Data': ''
      },
      body: JSON.stringify({ phone: '123', address: 'addr' })
    });
    console.log("Status:", res.status);
    console.log("Response:", await res.json());
  } catch (err) {
    console.error("Fetch error:", err);
  } finally {
    server.close();
    process.exit(0);
  }
});
