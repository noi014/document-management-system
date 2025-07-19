// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getConnection } from '@/lib/db'; // Adjust path if necessary
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise'; // Import RowDataPacket and ResultSetHeader

// Define a type for a common MySQL error that might have a 'code' property
interface MySQLError extends Error {
  code?: string;
  errno?: number;
}

export async function POST(req: Request) {
  let connection: PoolConnection | undefined;
  try {
    const { username,email, password, role, departmentId } = await req.json();

    // 1. Basic validation
    if (!username || !password) {
      return NextResponse.json({ message: 'โปรดระบุชื่อผู้ใช้งานและรหัสผ่าน' }, { status: 400 });
    }
 
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

    connection = await getConnection();

    // 2. Check if username already exists
    // Explicitly type the result of SELECT query
    const [existingUsersByUsername] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    // No need for 'as any[]' cast anymore
    if (existingUsersByUsername.length > 0) {
      return NextResponse.json({ message: 'ชื่อผู้ใช้งานนี้มีอยู่แล้ว' }, { status: 409 });
    }

    // 3. Insert new user
    // Explicitly type the result of INSERT query
    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO users (username,email, password, role, department_id)
       VALUES (?, ?, ?, ?, ?)`,
      [username,email, hashedPassword, role || 'user', departmentId || null] // Default role to 'user', department_id to null
    );

    // Check if the user was successfully inserted
    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'ไม่สามารถลงทะเบียนผู้ใช้งานได้' }, { status: 500 });
    }

    // Return success response
    return NextResponse.json({ message: 'ลงทะเบียนสำเร็จ' }, { status: 201 });

  } catch (error: unknown) { // Change 'any' to 'unknown' for better type safety
    const mysqlError = error as MySQLError; // Assert to MySQLError for checking 'code'
    console.error('Registration error:', mysqlError);

    // Handle specific MySQL errors, e.g., duplicate entry if an index exists on username
    if (mysqlError.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ message: 'ชื่อผู้ใช้งานนี้มีอยู่แล้ว' }, { status: 409 });
    }

    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการลงทะเบียน', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}