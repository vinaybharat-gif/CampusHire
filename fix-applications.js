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
    connection.query('DESCRIBE applications', (err, columns) => {
        console.log('Current applications table structure:');
        if (columns) {
            columns.forEach(col => console.log(col.Field));
        }
        
        // Drop and recreate the table
        connection.query('DROP TABLE IF EXISTS applications', (err) => {
            if (err) console.log('Error dropping table:', err.message);
            else console.log('Dropped old applications table');
            
            // Create new table
            const createTable = `
                CREATE TABLE applications (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    job_id INT NOT NULL,
                    applicant_id INT NOT NULL,
                    status VARCHAR(50) DEFAULT 'pending',
                    cover_letter TEXT,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;
            
            connection.query(createTable, (err) => {
                if (err) console.error('Error creating table:', err.message);
                else console.log('Applications table created successfully!');
                
                // Verify
                connection.query('DESCRIBE applications', (err, cols) => {
                    console.log('New table structure:');
                    cols.forEach(col => console.log(col.Field));
                    connection.release();
                    process.exit(0);
                });
            });
        });
    });
});
