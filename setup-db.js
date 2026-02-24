const mysql = require('mysql2');

const db = mysql.createPool({
   host: 'localhost',
   user: 'root',
   password: '13032025#@d',
   database: 'campusHire'
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.message);
        process.exit(1);
    }
    
    console.log('Connected to MySQL');
    
    // Create/update jobs table
    const createJobsTable = `
        CREATE TABLE IF NOT EXISTS jobs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(100) NOT NULL,
            company VARCHAR(100) NOT NULL,
            description TEXT,
            salary VARCHAR(50),
            location VARCHAR(100),
            job_type VARCHAR(50),
            posted_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;
    
    connection.query(createJobsTable, (err) => {
        if (err) {
            console.error('Error creating jobs table:', err.message);
        } else {
            console.log('Jobs table created/updated successfully!');
        }
    });
    
    // Insert some sample jobs
    const checkJobs = 'SELECT COUNT(*) as count FROM jobs';
    connection.query(checkJobs, (err, results) => {
        if (results[0].count === 0) {
            const sampleJobs = [
                { title: 'Software Engineer', company: 'Google', description: 'Build amazing products', salary: '$100,000' },
                { title: 'Web Developer', company: 'Microsoft', description: 'Create web applications', salary: '$80,000' },
                { title: 'Data Analyst', company: 'Amazon', description: 'Analyze data', salary: '$90,000' }
            ];
            
            sampleJobs.forEach(job => {
                connection.query('INSERT INTO jobs SET ?', job, (err) => {
                    if (err) console.error('Error inserting job:', err.message);
                });
            });
            console.log('Sample jobs inserted!');
        } else {
            console.log('Jobs already exist in database');
        }
    });
    
    connection.release();
    process.exit(0);
});
