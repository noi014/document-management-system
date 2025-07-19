// import mysql from 'mysql2/promise';

// export async function query(sql: string, params: any[]) {
//   const connection = await mysql.createConnection({
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_DATABASE,
//   });

//   try {
//     const [results] = await connection.execute(sql, params);
//     return results;
//   } catch (error) {
//     console.error("Database Query Error:", error);
//     throw new Error("Failed to execute database query.");
//   } finally {
//     await connection.end();
//   }
// }

// import mysql from 'mysql2/promise';

// export async function getConnection() {
//   const connection = await mysql.createConnection({
//      host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_DATABASE,
//   });
//   return connection;
// }

// src/lib/db.ts
// src/lib/db.ts
import mysql, { PoolConnection } from 'mysql2/promise';

// Create MySQL Connection Pool
// It's highly recommended to use environment variables for these credentials
const pool = mysql.createPool({
//   host: process.env.DB_HOST || 'localhost',
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || '',
//   database: process.env.DB_NAME || 'document_system',
//   waitForConnections: true, 
//  connectionLimit: 30,
//   queueLimit: 0,
//   charset: 'utf8mb4', // <--- เพิ่มบรรทัดนี้เข้ามา
  host: process.env.DB_HOST || 'gateway01.us-west-2.prod.aws.tidbcloud.com',
   port: parseInt(process.env.DB_PORT || '4000', 10), // <-- เพิ่มบรรทัดนี้เข้ามา
  user: process.env.DB_USER || '2wmePjWfByh6Xb3.root',
  password: process.env.DB_PASSWORD || 'cB5f1WA9MZJJTQ4E',
  database: process.env.DB_NAME || 'document_system',
  waitForConnections: true, 
 connectionLimit: 30,
  queueLimit: 0,
  charset: 'utf8mb4', // <--- เพิ่มบรรทัดนี้เข้ามา
});

/**
 * Function to get a connection from the pool.
 * It explicitly returns a Promise resolving to a PoolConnection.
 * @returns {Promise<PoolConnection>} A connection object from the pool.
 */
export async function getConnection(): Promise<PoolConnection> {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection obtained from pool.');
    return connection;
  } catch (error) {
    console.error('Error getting database connection from pool:', error);
    throw new Error('Failed to get database connection.');
  }
}

// Function to test connection (optional, but good for debugging)
export async function testDbConnection() {
  let connection: PoolConnection | undefined;
  try {
    connection = await pool.getConnection();
    console.log('Database connection test successful!');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}