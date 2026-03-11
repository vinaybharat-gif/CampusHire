const express = require('express');
const path = require('path');
const dns = require('dns');
const mongoose = require('mongoose');

// Use Google DNS to resolve MongoDB SRV records (fixes ISP DNS blocking)
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use(express.json());

// Serve static files from root directory
const staticDir = __dirname;
console.log('Static files directory:', staticDir);
app.use(express.static(staticDir));

// Explicit root route
app.get('/', (req, res) => {
    const indexPath = path.join(staticDir, 'index.html');
    console.log('Serving index.html from:', indexPath);
    res.sendFile(indexPath);
});

// ==================== DATABASE CONNECTION ====================

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Successfully connected to MongoDB Atlas.'))
    .catch(err => console.error('Error connecting to MongoDB:', err.message));

// ==================== MONGOOSE SCHEMAS ====================

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['student', 'recruiter', 'admin'], default: 'student' },
    created_at: { type: Date, default: Date.now }
});

const jobSchema = new mongoose.Schema({
    title: { type: String, required: true },
    company: { type: String, required: true },
    description: { type: String, required: true },
    location: String,
    salary: String,
    job_type: String,
    posted_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now }
});

const applicationSchema = new mongoose.Schema({
    job_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    applicant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cover_letter: String,
    status: { type: String, enum: ['pending', 'reviewed', 'accepted', 'rejected'], default: 'pending' },
    applied_at: { type: Date, default: Date.now }
});

// Prevent duplicate applications
applicationSchema.index({ job_id: 1, applicant_id: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);
const Job = mongoose.model('Job', jobSchema);
const Application = mongoose.model('Application', applicationSchema);

// ==================== AUTHENTICATION ROUTES ====================

// 1. Register a User
app.post('/api/register', async (req, res) => {
    console.log('Register attempt:', req.body);
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({ name, email, password_hash: hashedPassword, role: role || 'student' });
        await user.save();
        console.log('User registered successfully:', email);
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        console.error('Register Error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// 2. Login User & Generate JWT
app.post('/api/login', async (req, res) => {
    console.log('Login attempt:', req.body);
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            console.log('Login failed: User not found');
            return res.status(401).json({ error: 'User not found' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            console.log('Login failed: Invalid password');
            return res.status(401).json({ error: 'Invalid password' });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET || 'your-super-secret-jwt-key',
            { expiresIn: '24h' }
        );

        console.log('Login successful:', email);
        res.json({ message: 'Login successful', token, role: user.role, name: user.name, email: user.email });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
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

app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('name email role created_at');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const { name, email } = req.body;
        await User.findByIdAndUpdate(req.user.id, { name, email });
        res.json({ message: 'Profile updated successfully!' });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// ==================== JOB ROUTES ====================

app.get('/api/jobs', async (req, res) => {
    try {
        const jobs = await Job.find().sort({ _id: -1 });
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

app.get('/api/jobs/:id', async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);
        if (!job) return res.status(404).json({ error: 'Job not found' });
        res.json(job);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/jobs', authenticateToken, async (req, res) => {
    if (req.user.role !== 'recruiter' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only recruiters can post jobs' });
    }

    const { title, company, description, location, salary, job_type } = req.body;
    if (!title || !company || !description) {
        return res.status(400).json({ error: 'Title, company, and description are required' });
    }

    try {
        const job = new Job({ title, company, description, location, salary, job_type, posted_by: req.user.id });
        await job.save();
        res.status(201).json({ message: 'Job posted successfully!', jobId: job._id });
    } catch (err) {
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

app.delete('/api/jobs/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'recruiter' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only recruiters can delete jobs' });
    }

    try {
        await Job.findOneAndDelete({ _id: req.params.id, posted_by: req.user.id });
        res.json({ message: 'Job deleted successfully!' });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// ==================== APPLICATION ROUTES ====================

app.post('/api/applications', authenticateToken, async (req, res) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ error: 'Only students can apply for jobs' });
    }

    const { job_id, cover_letter } = req.body;
    if (!job_id) return res.status(400).json({ error: 'Job ID is required' });

    try {
        const existing = await Application.findOne({ job_id, applicant_id: req.user.id });
        if (existing) return res.status(400).json({ error: 'You have already applied for this job' });

        const application = new Application({ job_id, applicant_id: req.user.id, cover_letter });
        await application.save();
        res.status(201).json({ message: 'Application submitted successfully!' });
    } catch (err) {
        res.status(500).json({ error: 'Database error: ' + err.message });
    }
});

app.get('/api/applications/my', authenticateToken, async (req, res) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ error: 'Only students can view their applications' });
    }

    try {
        const applications = await Application.find({ applicant_id: req.user.id })
            .populate('job_id', 'title company location salary')
            .sort({ applied_at: -1 });
        res.json(applications);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/jobs/:id/applicants', authenticateToken, async (req, res) => {
    if (req.user.role !== 'recruiter' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only recruiters can view applicants' });
    }

    try {
        const applications = await Application.find({ job_id: req.params.id })
            .populate('applicant_id', 'name email');
        res.json(applications);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// ==================== ADMIN ROUTES ====================

app.get('/api/admin/users', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can view all users' });
    }

    try {
        const users = await User.find().select('name email role created_at').sort({ created_at: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can delete users' });
    }

    if (req.user.id == req.params.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully!' });
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// ==================== START SERVER ====================

app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
