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
    
    // Insert sample jobs
    const jobs = [
        { title: 'Software Engineer', company: 'Google', description: 'Build amazing products', salary: '$100,000' },
        { title: 'Web Developer', company: 'Microsoft', description: 'Create web applications', salary: '$80,000' },
        { title: 'Data Analyst', company: 'Amazon', description: 'Analyze data', salary: '$90,000' }
    ];
    
    jobs.forEach(job => {
        connection.query('INSERT INTO jobs SET ?', job, (err) => {
            if (err) console.error('Error inserting job:', job.title, err.message);
            else console.log('Inserted:', job.title);
        });
    });
    
    setTimeout(() => {
        connection.query('SELECT * FROM jobs', (err, results) => {
            console.log('Jobs in database:', results);
            connection.release();
            process.exit(0);
        });
    }, 1000);
});
