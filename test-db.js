const mysql = require('mysql2');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '13032025#@d',
    database: 'campusHire'
});

// Test connection
db.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to MySQL:');
        if (err.code === 'ER_BAD_DB_ERROR') {
            console.log("Database 'campusHire' does not exist!");
            console.log("Creating database...");
            
            // Create database without selecting it
            const tempDb = mysql.createPool({
                host: 'localhost',
                user: 'root',
                password: '13032025#@d'
            });
            
            tempDb.getConnection((err, conn) => {
                if (err) {
                    console.error('Could not connect to MySQL:', err.message);
                    process.exit(1);
                }
                
                conn.query('CREATE DATABASE IF NOT EXISTS campusHire', (err) => {
                    if (err) {
                        console.error('Error creating database:', err.message);
                        conn.release();
                        process.exit(1);
                    }
                    console.log("Database 'campusHire' created successfully!");
                    
                    // Now create the users table
                    conn.query('USE campusHire', (err) => {
                        if (err) {
                            console.error('Error selecting database:', err.message);
                            conn.release();
                            process.exit(1);
                        }
                        
                        const createTable = `
                            CREATE TABLE IF NOT EXISTS users (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                name VARCHAR(255) NOT NULL,
                                email VARCHAR(255) UNIQUE NOT NULL,
                                password_hash VARCHAR(255) NOT NULL,
                                role VARCHAR(50) DEFAULT 'student',
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                            )
                        `;
                        
                        conn.query(createTable, (err) => {
                            if (err) {
                                console.error('Error creating table:', err.message);
                            } else {
                                console.log("Table 'users' created successfully!");
                                console.log("\nDatabase setup complete! You can now use the app.");
                            }
                            conn.release();
                            process.exit(0);
                        });
                    });
                });
            });
        } else {
            console.error('Error:', err.message);
            process.exit(1);
        }
        return;
    }
    
    console.log('Connected to MySQL successfully!');
    console.log('Database "campusHire" exists!');
    
    // Check if users table exists
    connection.query('SHOW TABLES', (err, tables) => {
        if (err) {
            console.error('Error checking tables:', err.message);
        } else {
            console.log('Tables in database:', tables);
            if (tables.length === 0) {
                console.log("No tables found! Creating 'users' table...");
                
                const createTable = `
                    CREATE TABLE IF NOT EXISTS users (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        email VARCHAR(255) UNIQUE NOT NULL,
                        password_hash VARCHAR(255) NOT NULL,
                        role VARCHAR(50) DEFAULT 'student',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `;
                
                connection.query(createTable, (err) => {
                    if (err) {
                        console.error('Error creating table:', err.message);
                    } else {
                        console.log("Table 'users' created successfully!");
                    }
                });
            }
        }
    });
    
    connection.release();
});
