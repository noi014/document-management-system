// src/app/api/admin/departments/route.ts
import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db'; // ตรวจสอบให้แน่ใจว่า path นี้ถูกต้อง
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
export const dynamic = "force-static";
// --- Interface for type safety ---
interface DepartmentRow extends RowDataPacket {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

// Interface for MySQL errors that have a 'code' property
interface MySQLError extends Error {
  code?: string;
}

// --- Helper function to check admin role (placeholder) ---
// ใน production ควรใช้ middleware หรือ JWT token เพื่อการตรวจสอบสิทธิ์ที่เหมาะสม
async function checkAdminRole(userId: number): Promise<boolean> {
  let connection: PoolConnection | undefined;
  try {
    connection = await getConnection();
    // Correctly type the execute result for SELECT statements as RowDataPacket[]
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT role FROM users WHERE id = ?', [userId]);

    // Now, cast the rows to the desired specific type for your application logic
    const users = rows as { role: string }[];

    // อนุญาตให้ 'admin' หรือ 'super_user' เข้าถึงได้
    return users.length > 0 && (users[0].role === 'admin' || users[0].role === 'super_user');
  } catch (error: unknown) { // Ensure catch error is typed as unknown
    console.error('Error checking admin role:', error);
    return false;
  } finally {
    if (connection) connection.release();
  }
}

// --- GET: Fetch all internal departments ---
export async function GET() {
  let connection: PoolConnection | undefined;
  try {
    connection = await getConnection();
    const [rows] = await connection.query<DepartmentRow[]>( // Explicitly type rows
      `SELECT id, name, created_at, updated_at
       FROM departments
       ORDER BY created_at DESC`
    );
    return NextResponse.json(rows);
  } catch (error: unknown) { // Ensure catch error is typed as unknown
    console.error('Failed to fetch internal departments:', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// --- POST: Add a new internal department ---
export async function POST(req: Request) {
  let connection: PoolConnection | undefined;
  try {
    const { name: rawName } = await req.json(); // Use rawName to clarify initial type

    if (!rawName || typeof rawName !== 'string') {
      return NextResponse.json({ message: 'ชื่อหน่วยงานภายในไม่ถูกต้อง' }, { status: 400 });
    }
    const name: string = rawName; // Explicitly type name as string after validation

    const userId = req.headers.get('X-User-ID');
    const userRole = req.headers.get('X-User-Role');

    if (!userId || !userRole) {
      return NextResponse.json({ message: 'Authorization headers missing.' }, { status: 401 });
    }
 
    // Convert userId to number if necessary, assuming it comes as a string
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
      return NextResponse.json({ message: 'Invalid User ID in headers.' }, { status: 400 });
    }

    if (!(await checkAdminRole(numericUserId))) {
      return NextResponse.json({ message: 'ไม่ได้รับอนุญาต' }, { status: 403 });
    }

    connection = await getConnection();
    const [result] = await connection.execute<ResultSetHeader>(
      'INSERT INTO departments (name) VALUES (?)',
      [name] // Line 80:33 will now correctly infer `name` as string
    );

    const insertId = result.insertId;
    const [newDepartmentRows] = await connection.query<RowDataPacket[]>( // Type as RowDataPacket[]
      'SELECT id, name, created_at, updated_at FROM departments WHERE id = ?',
      [insertId]
    );

    const newDepartment: DepartmentRow[] = newDepartmentRows as DepartmentRow[]; // Cast to DepartmentRow[]

    if (newDepartment.length > 0) {
      return NextResponse.json(newDepartment[0], { status: 201 });
    } else {
      return NextResponse.json({ message: 'ไม่พบหน่วยงานภายในที่สร้างขึ้นใหม่' }, { status: 500 });
    }

  } catch (error: unknown) { // Line 87:19: Changed 'any' to 'unknown'
    const mysqlError = error as MySQLError; // Cast to MySQLError for checking 'code'
    if (mysqlError.code === 'ER_DUP_ENTRY') { // Check for duplicate entry error code
      return NextResponse.json({ message: 'ชื่อหน่วยงานภายในนี้มีอยู่แล้ว' }, { status: 409 });
    }
    console.error('Failed to add internal department:', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการเพิ่มหน่วยงานภายใน' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// --- PUT: Update an existing internal department ---
export async function PUT(req: Request) {
  let connection: PoolConnection | undefined;
  try {
    const { id, name } = await req.json();

    if (!id || typeof id !== 'number' || !name || typeof name !== 'string') {
      return NextResponse.json({ message: 'ID หรือชื่อหน่วยงานภายในไม่ถูกต้อง' }, { status: 400 });
    }

    const userId = req.headers.get('X-User-ID');
    const userRole = req.headers.get('X-User-Role');

    if (!userId || !userRole) {
      return NextResponse.json({ message: 'Authorization headers missing.' }, { status: 401 });
    }

    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
      return NextResponse.json({ message: 'Invalid User ID in headers.' }, { status: 400 });
    }

    if (!(await checkAdminRole(numericUserId))) {
      return NextResponse.json({ message: 'ไม่ได้รับอนุญาต' }, { status: 403 });
    }

    connection = await getConnection();
    const [result] = await connection.execute<ResultSetHeader>(
      'UPDATE departments SET name = ?, updated_at = NOW() WHERE id = ?',
      [name, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'ไม่พบหน่วยงานภายในที่ต้องการอัปเดตหรือไม่มีการเปลี่ยนแปลงข้อมูล' }, { status: 404 });
    }

    const [updatedDepartmentRows] = await connection.query<RowDataPacket[]>( // Type as RowDataPacket[]
      'SELECT id, name, created_at, updated_at FROM departments WHERE id = ?',
      [id]
    );

    const updatedDepartment: DepartmentRow[] = updatedDepartmentRows as DepartmentRow[]; // Cast to DepartmentRow[]

    if (updatedDepartment.length > 0) {
      return NextResponse.json(updatedDepartment[0], { status: 200 });
    } else {
      return NextResponse.json({ message: 'ไม่สามารถดึงข้อมูลหน่วยงานภายในที่อัปเดตได้' }, { status: 500 });
    }

  } catch (error: unknown) { // Line 124:19: Changed 'any' to 'unknown'
    const mysqlError = error as MySQLError; // Cast to MySQLError for checking 'code'
    if (mysqlError.code === 'ER_DUP_ENTRY') { // Check for duplicate entry error code
      return NextResponse.json({ message: 'ชื่อหน่วยงานภายในนี้มีอยู่แล้ว' }, { status: 409 });
    }
    console.error('Failed to update internal department:', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการอัพเดทหน่วยงานภายใน', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// --- DELETE: Delete an internal department ---
export async function DELETE(req: Request) {
  let connection: PoolConnection | undefined;
  const { id } = await req.json();

  const userId = req.headers.get('X-User-ID');
  const userRole = req.headers.get('X-User-Role');

  if (!userId || !userRole) {
    return NextResponse.json({ message: 'Authorization headers missing.' }, { status: 401 });
  }

  const numericUserId = parseInt(userId, 10);
  if (isNaN(numericUserId)) {
    return NextResponse.json({ message: 'Invalid User ID in headers.' }, { status: 400 });
  }

  if (!(await checkAdminRole(numericUserId))) {
    return NextResponse.json({ message: 'ไม่ได้รับอนุญาต' }, { status: 403 });
  }

  if (!id || typeof id !== 'number') {
    return NextResponse.json({ message: 'ID หน่วยงานภายในไม่ถูกต้อง' }, { status: 400 });
  }

  try {
    connection = await getConnection();
    const [result] = await connection.execute<ResultSetHeader>(
      'DELETE FROM departments WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'ไม่พบหน่วยงานภายในที่ต้องการลบ' }, { status: 404 });
    }
    return NextResponse.json({ message: 'ลบหน่วยงานภายในสำเร็จ' });
  } catch (error: unknown) { // Line 160:19: Changed 'any' to 'unknown'
    console.error('Failed to delete internal department:', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการลบข้อมูล' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}