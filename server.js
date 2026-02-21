const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Serve static files from current directory
app.use(express.static(__dirname));

// Root route
app.get('/', (req, res) => {
    res.send('CampusHire API is running. Use /api/register or /api/login endpoints.');
});

// Database Connection
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '13032025#@d',
    database: 'campusHire'
});

// ==================== AUTHENTICATION ROUTES ====================

// 1. Register a User
app.post('/api/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const query = 'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)';
        db.query(query, [name, email, hashedPassword, role || 'student'], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Email already exists' });
                }
                return res.status(500).json({ error: 'Database error', details: err.message });
            }
            res.status(201).json({ message: 'User registered successfully!' });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// 2. Login User & Generate JWT
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

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
            { expiresIn: '24h' }
        );

        res.json({ 
            message: 'Login successful', 
            token, 
            role: user.role,
            name: user.name,
            email: user.email
        });
    });
});

// ==================== MIDDLEWARE ====================

const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid token.' });
        req.user = decoded;
        next();
    });
};

// ==================== USER ROUTES ====================

// Get current user profile
app.get('/api/user/profile', authenticateToken, (req, res) => {
    const query = 'SELECT id, name, email, role, created_at FROM users WHERE id = ?';
    db.query(query, [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(results[0]);
    });
});

// Update user profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
    const { name, email } = req.body;
    const query = 'UPDATE users SET name = ?, email = ? WHERE id = ?';
    db.query(query, [name, email, req.user.id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Profile updated successfully!' });
    });
});

// ==================== JOB ROUTES ====================

// Get all jobs (for students)
app.get('/api/jobs', (req, res) => {
    const query = 'SELECT * FROM jobs ORDER BY id DESC';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
        res.json(results);
    });
});

// Get single job
app.get('/api/jobs/:id', (req, res) => {
    const query = 'SELECT * FROM jobs WHERE id = ?';
    db.query(query, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (results.length === 0) return res.status(404).json({ error: 'Job not found' });
        res.json(results[0]);
    });
});

// Post a new job (for recruiters/admins)
app.post('/api/jobs', authenticateToken, (req, res) => {
    if (req.user.role !== 'recruiter' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only recruiters can post jobs' });
    }
    
    const { title, company, description, location, salary, job_type } = req.body;
    
    if (!title || !company || !description) {
        return res.status(400).json({ error: 'Title, company, and description are required' });
    }
    
    const query = 'INSERT INTO jobs (title, company, description, location, salary, job_type, posted_by) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(query, [title, company, description, location, salary, job_type, req.user.id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error', details: err.message });
        res.status(201).json({ message: 'Job posted successfully!', jobId: result.insertId });
    });
});

// Delete a job (for recruiters/admins)
app.delete('/api/jobs/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'recruiter' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only recruiters can delete jobs' });
    }
    
    const query = 'DELETE FROM jobs WHERE id = ? AND posted_by = ?';
    db.query(query, [req.params.id, req.user.id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Job deleted successfully!' });
    });
});

// ==================== APPLICATION ROUTES ====================

// Apply for a job (for students)
app.post('/api/applications', authenticateToken, (req, res) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ error: 'Only students can apply for jobs' });
    }
    
    const { job_id, cover_letter } = req.body;
    
    if (!job_id) {
        return res.status(400).json({ error: 'Job ID is required' });
    }
    
    // Check if already applied
    const checkQuery = 'SELECT * FROM applications WHERE job_id = ? AND applicant_id = ?';
    db.query(checkQuery, [job_id, req.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
        if (results.length > 0) return res.status(400).json({ error: 'You have already applied for this job' });
        
        // Insert application
        const insertQuery = 'INSERT INTO applications (job_id, applicant_id, cover_letter) VALUES (?, ?, ?)';
        db.query(insertQuery, [job_id, req.user.id, cover_letter], (err, result) => {
            if (err) return res.status(500).json({ error: 'Database error: ' + err.message });
            res.status(201).json({ message: 'Application submitted successfully!' });
        });
    });
});

// Get my applications (for students)
app.get('/api/applications/my', authenticateToken, (req, res) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ error: 'Only students can view their applications' });
    }
    
    const query = `
        SELECT a.*, j.title, j.company, j.location, j.salary 
        FROM applications a 
        JOIN jobs j ON a.job_id = j.id 
        WHERE a.applicant_id = ? 
        ORDER BY a.applied_at DESC
    `;
    db.query(query, [req.user.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});

// Get applicants for a job (for recruiters)
app.get('/api/jobs/:id/applicants', authenticateToken, (req, res) => {
    if (req.user.role !== 'recruiter' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only recruiters can view applicants' });
    }
    
    const query = `
        SELECT a.*, u.name, u.email 
        FROM applications a 
        JOIN users u ON a.applicant_id = u.id 
        WHERE a.job_id = ?
    `;
    db.query(query, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});

// ==================== ADMIN ROUTES ====================

// Get all users (for admin)
app.get('/api/admin/users', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can view all users' });
    }
    
    const query = 'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});

// Delete a user (for admin)
app.delete('/api/admin/users/:id', authenticateToken, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can delete users' });
    }
    
    if (req.user.id == req.params.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const query = 'DELETE FROM users WHERE id = ?';
    db.query(query, [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'User deleted successfully!' });
    });
});

// ==================== START SERVER ====================

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
