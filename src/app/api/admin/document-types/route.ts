// src/app/api/admin/document-types/route.ts
import { NextResponse } from 'next/server';
import { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { getConnection } from '@/lib/db';
//export const dynamic = "force-static";
// --- Interface for type safety ---
interface DocumentTypeRow extends RowDataPacket {
  id: number;
  name: string;
  // Note: 'description' and timestamps are not in your provided SQL,
  // but are common. If you add them later, update this interface and queries.
  // description?: string | null;
  // created_at?: string;
  // updated_at?: string;
}

// --- Helper function to check admin role (placeholder) ---
// In a production environment, you should use middleware or JWT tokens for authentication.
async function checkAdminRole(userId: number): Promise<boolean> {
  let connection: PoolConnection | undefined;
  try {
    connection = await getConnection();
    const [rows] = await connection.execute('SELECT role FROM users WHERE id = ?', [userId]);
    const users = rows as { role: string }[];
    return users.length > 0 && users[0].role === 'admin';
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  } finally {
    if (connection) connection.release();
  }
}

// --- GET: Fetch all document types ---
export async function GET() {
  let connection: PoolConnection | undefined;
  //const adminId = 1; // Placeholder for user ID. Replace with actual user ID from session/token.+
    // const userId = req.headers.get('X-User-ID');
    // const userRole = req.headers.get('X-User-Role');
//  if (!(await checkAdminRole(adminId))) {
  // if (!userId || !userRole) {
  //   return NextResponse.json({ message: 'ไม่ได้รับอนุญาต' }, { status: 403 });
  // }

  try {
    connection = await getConnection();
    // Query only 'id' and 'name' as per your provided table structure
    const [rows] = await connection.execute<DocumentTypeRow[]>(
      'SELECT id, name FROM document_types ORDER BY id ASC'
    );
    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('Error fetching document types:', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลประเภทเอกสาร' }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
} 

// --- POST: Add a new document type req: Request ---
export async function POST(req: Request) {
  let connection: PoolConnection | undefined;
  const { name } = await req.json(); // Only 'name' is in your table structure

  const adminId = 1; // Placeholder for user ID. Replace with actual user ID from session/token.
  if (!(await checkAdminRole(adminId))) {
    return NextResponse.json({ message: 'ไม่ได้รับอนุญาต' }, { status: 403 });
  }

  if (!name) {
    return NextResponse.json({ message: 'ข้อมูลไม่ครบถ้วน: ชื่อประเภทเอกสารเป็นค่าที่จำเป็น' }, { status: 400 });
  }

  try {
    connection = await getConnection();
    // Check for existing document type name (assuming 'name' is UNIQUE, which it should be)
    const [existing] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM document_types WHERE name = ?',
      [name]
    );
    if (existing.length > 0) {
      return NextResponse.json({ message: 'ชื่อประเภทเอกสารนี้มีอยู่แล้ว' }, { status: 409 });
    }

    const [result] = await connection.execute<ResultSetHeader>(
      'INSERT INTO document_types (name) VALUES (?)', // Insert only 'name'
      [name]
    );
    return NextResponse.json({ message: 'เพิ่มประเภทเอกสารสำเร็จ', id: result.insertId }, { status: 201 });
  } catch (error) {
    console.error('Error adding document type:', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการเพิ่มประเภทเอกสาร', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// --- PUT: Update an existing document type ---
export async function PUT(req: Request) {
  let connection: PoolConnection | undefined;
  const { id, name } = await req.json(); // Only 'id' and 'name' are relevant here

  // const adminId = 1; // Placeholder for user ID. Replace with actual user ID from session/token.
  // if (!(await checkAdminRole(adminId))) {
    const userId = req.headers.get('X-User-ID');
    const userRole = req.headers.get('X-User-Role');
//  if (!(await checkAdminRole(adminId))) {
  if (!userId || !userRole) {
    return NextResponse.json({ message: 'ไม่ได้รับอนุญาต' }, { status: 403 });
  }

  if (!id || !name) {
    return NextResponse.json({ message: 'ข้อมูลไม่ครบถ้วน: ID และชื่อประเภทเอกสารเป็นค่าที่จำเป็น' }, { status: 400 });
  }

  try {
    connection = await getConnection();
    // Check for existing document type name for other IDs
    const [existing] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM document_types WHERE name = ? AND id != ?',
      [name, id]
    );
    if (existing.length > 0) {
      return NextResponse.json({ message: 'ชื่อประเภทเอกสารนี้มีอยู่แล้วสำหรับรายการอื่น' }, { status: 409 });
    }

    const [result] = await connection.execute<ResultSetHeader>(
      'UPDATE document_types SET name = ? WHERE id = ?', // Update only 'name'
      [name, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'ไม่พบประเภทเอกสารที่ต้องการอัพเดท' }, { status: 404 });
    }
    return NextResponse.json({ message: 'อัพเดทประเภทเอกสารสำเร็จ' });
  } catch (error) {
    console.error('Error updating document type:', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการอัพเดทประเภทเอกสาร', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// --- DELETE: Delete a document type ---
export async function DELETE(req: Request) {
  let connection: PoolConnection | undefined;
  const { id } = await req.json();

  // const adminId = 1; // Placeholder for user ID. Replace with actual user ID from session/token.
  
  //if (!(await checkAdminRole(adminId))) {
     const userId = req.headers.get('X-User-ID');
    const userRole = req.headers.get('X-User-Role');
  if (!userId || !userRole) {
    return NextResponse.json({ message: 'ไม่ได้รับอนุญาต' }, { status: 403 });
  }

  if (!id || typeof id !== 'number') {
    return NextResponse.json({ message: 'ID ประเภทเอกสารไม่ถูกต้อง' }, { status: 400 });
  }

  try {
    connection = await getConnection();

    // Optional but recommended: Check if this document type is being used
    // by any 'incoming_documents' to prevent foreign key errors.
    // If you have a foreign key constraint, the DB will prevent deletion,
    // but a soft check here provides a more user-friendly error message.
    /*
    const [usageCheck] = await connection.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM incoming_documents WHERE document_type_id = ?',
      [id]
    );
    if ((usageCheck[0] as any).count > 0) {
      return NextResponse.json({ message: 'ไม่สามารถลบประเภทเอกสารนี้ได้ เนื่องจากมีเอกสารอื่นใช้งานอยู่' }, { status: 409 });
    }
    */

    const [result] = await connection.execute<ResultSetHeader>(
      'DELETE FROM document_types WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: 'ไม่พบประเภทเอกสารที่ต้องการลบ' }, { status: 404 });
    }
    return NextResponse.json({ message: 'ลบประเภทเอกสารสำเร็จ' });
  } catch (error) {
    console.error('Error deleting document type:', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการลบประเภทเอกสาร', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}