const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json()); // To parse JSON bodies
app.use(cors()); // To allow requests from your HTML frontend

// Database Connection
const db = mysql.createPool({
    host: 'localhost',
    user: 'root', // Replace with your MySQL username
    password: '1234', // Replace with your MySQL password
    database: 'campusHire'
});

// --- AUTHENTICATION ROUTES ---

// 1. Register a User
app.post('/api/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    
    try {
        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert into database
        const query = 'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)';
        db.query(query, [name, email, hashedPassword, role || 'student'], (err, result) => {
            if (err) return res.status(500).json({ error: 'Database error', details: err });
            res.status(201).json({ message: 'User registered successfully!' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. Login User & Generate JWT
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(401).json({ error: 'User not found' });

        const user = results[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) return res.status(401).json({ error: 'Invalid password' });

        // Generate Token
        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        res.json({ message: 'Login successful', token, role: user.role });
    });
});

// --- MIDDLEWARE ---
// Use this to protect routes that require a logged-in user
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid token.' });
        req.user = decoded; // Adds the user info (id, role) to the request
        next();
    });
};

// Start Server
app.listen(3000, () => {
    console.log('Server running on port 3000');
});