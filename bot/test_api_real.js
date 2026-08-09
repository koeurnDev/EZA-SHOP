require('dotenv').config();
const express = require('express');
const { verifyUser } = require('./middleware/auth');
const userController = require('./controllers/userController');
const authUtils = require('./utils/auth');

// Mock validateInitData to always return true
authUtils.validateInitData = () => true;

const app = express();
app.use(express.json());
app.put('/api/user/profile', verifyUser, userController.updateProfile);

const server = app.listen(3006, async () => {
  console.log("Server listening on 3006");
  try {
    const fakeInitData = 'user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Test%22%7D';
    const res = await fetch('http://localhost:3006/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-TG-Data': fakeInitData
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
