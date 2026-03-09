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
    
    // Create applications table
    const createApplicationsTable = `
        CREATE TABLE IF NOT EXISTS applications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            job_id INT NOT NULL,
            applicant_id INT NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (job_id) REFERENCES jobs(id),
            FOREIGN KEY (applicant_id) REFERENCES users(id)
        )
    `;
    
    connection.query(createApplicationsTable, (err) => {
        if (err) {
            console.error('Error creating applications table:', err.message);
        } else {
            console.log('Applications table created/updated successfully!');
        }
        connection.release();
        process.exit(0);
    });
});
