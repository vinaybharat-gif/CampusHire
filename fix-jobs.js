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
    
    // Check current table structure
    connection.query('DESCRIBE jobs', (err, columns) => {
        console.log('Current jobs table structure:', columns.map(c => c.Field));
        
        // Check if salary column exists
        const hasSalary = columns.some(c => c.Field === 'salary');
        
        if (!hasSalary) {
            // Add salary column
            connection.query('ALTER TABLE jobs ADD COLUMN salary VARCHAR(50)', (err) => {
                if (err) console.log('Error adding salary column:', err.message);
                else console.log('Added salary column');
                insertJobs(connection);
            });
        } else {
            insertJobs(connection);
        }
    });
    
    function insertJobs(conn) {
        // Insert sample jobs
        const jobs = [
            { title: 'Software Engineer', company: 'Google', description: 'Build amazing products', salary: '$100,000' },
            { title: 'Web Developer', company: 'Microsoft', description: 'Create web applications', salary: '$80,000' },
            { title: 'Data Analyst', company: 'Amazon', description: 'Analyze data', salary: '$90,000' }
        ];
        
        jobs.forEach(job => {
            conn.query('INSERT INTO jobs SET ?', job, (err) => {
                if (err) console.error('Error inserting job:', job.title, err.message);
                else console.log('Inserted:', job.title);
            });
        });
        
        setTimeout(() => {
            conn.query('SELECT * FROM jobs', (err, results) => {
                console.log('Jobs in database:', JSON.stringify(results, null, 2));
                conn.release();
                process.exit(0);
            });
        }, 1000);
    }
});
