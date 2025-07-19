// src/app/api/admin/external-agencies/route.ts

import { NextResponse, NextRequest } from 'next/server';
import { getConnection } from '@/lib/db';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
//export const dynamic = "force-static";
// Define a type for external agency rows
interface ExternalAgencyRow extends RowDataPacket {
  id: number;
  name: string;
  address: string | null; // Added address, contact_person, etc. for completeness based on page.tsx interface
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

// Define a type for MySQL errors
interface MySQLError extends Error {
  code?: string;
  errno?: number;
}

// Helper function to check admin/super_user role
async function checkAdminRole(userId: number): Promise<boolean> {
  let connection: PoolConnection | undefined;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT role FROM users WHERE id = ?', [userId]);
    const users = rows as { role: string }[];
    return users.length > 0 && (users[0].role === 'admin' || users[0].role === 'super_user');
  } catch (error: unknown) { // Use unknown for caught errors
    console.error('Error checking admin role:', error);
    return false;
  } finally {
    if (connection) connection.release();
  }
}

// Helper to extract userId from headers
async function getUserIdFromHeaders(req: NextRequest): Promise<number | null> {
  const userIdHeader = req.headers.get('X-User-ID');
  if (userIdHeader) {
    const userId = parseInt(userIdHeader, 10);
    if (!isNaN(userId)) {
      return userId;
    }
  }
  return null;
}

// --- GET: Fetch all external agencies ---
export async function GET() { // req: Request Use NextRequest to access headers
  let connection: PoolConnection | undefined;
  try {
   // const userId = 1;//await getUserIdFromHeaders(req);
    // const userId = req.headers.get('X-User-ID');
    // const userRole = req.headers.get('X-User-Role');
    // //if (userId === null || !(await checkAdminRole(userId))) {
    // if (!userId || !userRole) {
    //   return NextResponse.json({ message: 'ไม่ได้รับอนุญาต' }, { status: 403 });
    // }

    connection = await getConnection();
    const [rows] = await connection.query<ExternalAgencyRow[]>(
      `SELECT id, name, address, contact_person, contact_email, contact_phone, created_at, updated_at
       FROM external_agencies
       ORDER BY created_at DESC`
    );
    // FIX: Wrap the rows in a 'data' property
    return NextResponse.json({ data: rows });
  } catch (error: unknown) { // Use unknown for caught errors
    console.error('Failed to fetch external agencies:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลหน่วยงานภายนอก', error: errorMessage }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// --- POST: Add a new external agency ---
export async function POST(req: NextRequest) { // Use NextRequest for headers
  let connection: PoolConnection | undefined;
  try {
    const { name, address, contact_person, contact_email, contact_phone } = await req.json();

  //  const userId = 1;//await getUserIdFromHeaders(req);
   // if (userId === null || !(await checkAdminRole(userId))) {
    const userId = req.headers.get('X-User-ID');
    const userRole = req.headers.get('X-User-Role');
     if (!userId || !userRole) {
      return NextResponse.json({ message: 'ไม่ได้รับอนุญาต' }, { status: 403 });
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ message: 'ชื่อหน่วยงานภายนอกไม่ถูกต้อง' }, { status: 400 });
    }

    connection = await getConnection();
    const [result] = await connection.execute<ResultSetHeader>(
      'INSERT INTO external_agencies (name, address, contact_person, contact_email, contact_phone) VALUES (?, ?, ?, ?, ?)',
      [name, address || null, contact_person || null, contact_email || null, contact_phone || null]
    );

    const insertId = result.insertId;
    const [newAgencyRows] = await connection.query<ExternalAgencyRow[]>(
      'SELECT id, name, address, contact_person, contact_email, contact_phone, created_at, updated_at FROM external_agencies WHERE id = ?',
      [insertId]
    );

    if (newAgencyRows.length > 0) {
      return NextResponse.json(newAgencyRows[0], { status: 201 });
    } else {
      return NextResponse.json({ message: 'ไม่พบหน่วยงานภายนอกที่สร้างขึ้นใหม่' }, { status: 500 });
    }

  } catch (error: unknown) { // Use unknown for caught errors
    const mysqlError = error as MySQLError;
    if (mysqlError.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ message: 'ชื่อหน่วยงานภายนอกนี้มีอยู่แล้ว' }, { status: 409 });
    }
    console.error('Failed to add external agency:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการเพิ่มหน่วยงานภายนอก', error: errorMessage }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// --- PUT: Update an existing external agency ---
export async function PUT(req: NextRequest) { // Use NextRequest for headers
  let connection: PoolConnection | undefined;
  try {
    const { id, name, address, contact_person, contact_email, contact_phone } = await req.json();

   // const userId = 1;//await getUserIdFromHeaders(req);
   // if (userId === null || !(await checkAdminRole(userId))) {
      const userId = req.headers.get('X-User-ID');
    const userRole = req.headers.get('X-User-Role');
     if (!userId || !userRole) {
      return NextResponse.json({ message: 'ไม่ได้รับอนุญาต' }, { status: 403 });
    }

    if (!id || typeof id !== 'number' || !name || typeof name !== 'string') {
      return NextResponse.json({ message: 'ID หรือชื่อหน่วยงานภายนอกไม่ถูกต้อง' }, { status: 400 });
    }

    connection = await getConnection();
    const [result] = await connection.execute<ResultSetHeader>(
      'UPDATE external_agencies SET name = ?, address = ?, contact_person = ?, contact_email = ?, contact_phone = ?, updated_at = NOW() WHERE id = ?',
      [name, address || null, contact_person || null, contact_email || null, contact_phone || null, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'ไม่พบหน่วยงานภายนอกที่ต้องการอัปเดตหรือไม่มีการเปลี่ยนแปลงข้อมูล' }, { status: 404 });
    }

    const [updatedAgencyRows] = await connection.query<ExternalAgencyRow[]>(
      'SELECT id, name, address, contact_person, contact_email, contact_phone, created_at, updated_at FROM external_agencies WHERE id = ?',
      [id]
    );

    if (updatedAgencyRows.length > 0) {
      return NextResponse.json(updatedAgencyRows[0], { status: 200 });
    } else {
      return NextResponse.json({ message: 'ไม่สามารถดึงข้อมูลหน่วยงานภายนอกที่อัปเดตได้' }, { status: 500 });
    }

  } catch (error: unknown) { // Use unknown for caught errors
    const mysqlError = error as MySQLError;
    if (mysqlError.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ message: 'ชื่อหน่วยงานภายนอกนี้มีอยู่แล้ว' }, { status: 409 });
    }
    console.error('Failed to update external agency:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการอัปเดตหน่วยงานภายนอก', error: errorMessage }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// --- DELETE: Delete an external agency ---
export async function DELETE(req: NextRequest) { // Use NextRequest for headers
  let connection: PoolConnection | undefined;
  const { id } = await req.json();
 
  const userId = await getUserIdFromHeaders(req);
  if (userId === null || !(await checkAdminRole(userId))) {
    return NextResponse.json({ message: 'ไม่ได้รับอนุญาต' }, { status: 403 });
  }

  if (!id || typeof id !== 'number') {
    return NextResponse.json({ message: 'ID หน่วยงานภายนอกไม่ถูกต้อง' }, { status: 400 });
  }

  try {
    connection = await getConnection();
    const [result] = await connection.execute<ResultSetHeader>(
      'DELETE FROM external_agencies WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'ไม่พบหน่วยงานภายนอกที่ต้องการลบ' }, { status: 404 });
    }
    return NextResponse.json({ message: 'ลบหน่วยงานภายนอกสำเร็จ' });
  } catch (error: unknown) { // Use unknown for caught errors
    console.error('Failed to delete external agency:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการลบหน่วยงานภายนอก', error: errorMessage }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
