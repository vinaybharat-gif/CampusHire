const mongoose = require('mongoose');
require('dotenv').config();

const jobSchema = new mongoose.Schema({
    title: String,
    company: String,
    description: String,
    location: String,
    salary: String,
    job_type: String,
    posted_by: mongoose.Schema.Types.ObjectId,
    created_at: { type: Date, default: Date.now }
});

const Job = mongoose.model('Job', jobSchema);

const sampleJobs = [
    { title: 'Software Engineer', company: 'Google', description: 'Build amazing products and work on cutting-edge technology', location: 'Bangalore', salary: '₹15,00,000', job_type: 'Full-time' },
    { title: 'Web Developer', company: 'Microsoft', description: 'Create web applications and services', location: 'Hyderabad', salary: '₹12,00,000', job_type: 'Full-time' },
    { title: 'Data Analyst', company: 'Amazon', description: 'Analyze data and provide insights', location: 'Chennai', salary: '₹10,00,000', job_type: 'Full-time' },
    { title: 'Frontend Developer', company: 'Flipkart', description: 'Build user interfaces for e-commerce platform', location: 'Bangalore', salary: '₹8,00,000', job_type: 'Full-time' },
    { title: 'Backend Developer', company: 'Paytm', description: 'Develop server-side applications', location: 'Noida', salary: '₹9,00,000', job_type: 'Full-time' },
    { title: 'Machine Learning Engineer', company: 'Netflix', description: 'Work on recommendation algorithms', location: 'Bangalore', salary: '₹20,00,000', job_type: 'Full-time' },
    { title: 'DevOps Engineer', company: 'Adobe', description: 'Manage cloud infrastructure and CI/CD', location: 'Bangalore', salary: '₹14,00,000', job_type: 'Full-time' },
    { title: 'UI/UX Designer', company: 'Swiggy', description: 'Design user interfaces and experiences', location: 'Bangalore', salary: '₹7,00,000', job_type: 'Full-time' }
];

async function insertJobs() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Check if jobs already exist
        const count = await Job.countDocuments();
        if (count > 0) {
            console.log(`Already have ${count} jobs in database`);
            const jobs = await Job.find();
            console.log('Existing jobs:', jobs);
        } else {
            // Insert sample jobs
            const insertedJobs = await Job.insertMany(sampleJobs);
            console.log(`Inserted ${insertedJobs.length} jobs successfully!`);
        }

        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

insertJobs();
