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
    
    // Check users table structure
    connection.query('DESCRIBE users', (err, columns) => {
        if (err) {
            console.error('Error checking users table:', err.message);
            connection.release();
            process.exit(1);
        }

        const hasRole = columns.some(c => c.Field === 'role');
        
        if (!hasRole) {
            console.log('Role column missing. Adding it now...');
            connection.query("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'student'", (err) => {
                if (err) console.error('Error adding role column:', err.message);
                else console.log('Successfully added role column to users table!');
                connection.release();
                process.exit(0);
            });
        } else {
            console.log('Users table already has role column. Structure is correct.');
            connection.release();
            process.exit(0);
        }
    });
});