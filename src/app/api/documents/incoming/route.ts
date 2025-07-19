// app/api/documents/incoming/route.ts
import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';
import { PoolConnection, OkPacket, RowDataPacket } from 'mysql2/promise';
//export const dynamic = "force-static";
// Helper to extract userId from headers
async function getUserIdFromHeaders(req: Request): Promise<number | null> {
  const userIdHeader = req.headers.get('x-user-id');
  if (userIdHeader) {
    const userId = parseInt(userIdHeader);
    if (!isNaN(userId)) {
      return userId;
    }
  }
  return null;
}

// Helper to get user's role and department ID
interface UserAuthInfo {
  role: string;
  department_id: number | null;
}

async function getUserRoleAndDepartment(userId: number): Promise<UserAuthInfo | null> {
  let connection: PoolConnection | undefined;
  try {
    connection = await getConnection();
    const [rows] = await connection.query(
      `SELECT role, department_id FROM users WHERE id = ?`,
      [userId]
    );
    const user = (rows as RowDataPacket[])[0];
    if (user) {
      return {
        role: user.role as string,
        department_id: user.department_id as number | null,
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching user role and department:', error);
    return null;
  } finally {
    if (connection) connection.release();
  }
}

// GET: ดึงข้อมูลหนังสือรับทั้งหมดพร้อมหน่วยงานภายในที่รับ (multi-select)
export async function GET(req: Request) {
  let connection: PoolConnection | undefined;
  try {
    connection = await getConnection();

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    const searchBy = url.searchParams.get('searchBy') || 'all'; 
    const startDate = url.searchParams.get('startDate') || '';
    const endDate = url.searchParams.get('endDate') || '';
    const searchDepartmentId = url.searchParams.get('searchDepartmentId'); // New: Get department ID for search
    const offset = (page - 1) * limit;
    
    // ดึง userId จาก Header
    const currentUserId = await getUserIdFromHeaders(req);
    if (currentUserId === null) {
      return NextResponse.json({ message: 'ไม่พบ User ID หรือ User ID ไม่ถูกต้องใน Header', error: 'Unauthorized' }, { status: 401 });
    }

    const userAuthInfo = await getUserRoleAndDepartment(currentUserId);
    if (!userAuthInfo) {
      return NextResponse.json({ message: 'ไม่พบข้อมูลผู้ใช้สำหรับ User ID นี้', error: 'User Not Found' }, { status: 404 });
    }

    const whereClauses: string[] = [];
    const queryParams: unknown[] = [];

    // --- Role-based filtering for GET request ---
    if (userAuthInfo.role === 'user' && userAuthInfo.department_id !== null) {
      // If a regular user, filter by their department ID using the junction table
      whereClauses.push('EXISTS (SELECT 1 FROM incoming_document_departments WHERE incoming_document_id = idocs.id AND department_id = ?)');
      queryParams.push(userAuthInfo.department_id);
    } else if (userAuthInfo.role === 'admin' || userAuthInfo.role === 'super_user') {
      // For admin/super-user, apply searchDepartmentId if provided
      if (searchDepartmentId) {
        whereClauses.push('EXISTS (SELECT 1 FROM incoming_document_departments WHERE incoming_document_id = idocs.id AND department_id = ?)');
        queryParams.push(parseInt(searchDepartmentId));
      }
    } else {
      // If not super_user/admin and not a regular user with a department, deny access
      return NextResponse.json({ message: 'ไม่ได้รับอนุญาต: คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้' }, { status: 403 });
    }
    // --- END Role-based filtering ---

    if (search) {
      if (searchBy === 'doc_number') {
        whereClauses.push('idocs.doc_number LIKE ?');
        queryParams.push(`%${search}%`);
      } else if (searchBy === 'subject') {
        whereClauses.push('idocs.subject LIKE ?');
        queryParams.push(`%${search}%`);
      } else { // searchBy === 'all'
        whereClauses.push('(idocs.doc_number LIKE ? OR idocs.subject LIKE ?)');
        queryParams.push(`%${search}%`, `%${search}%`);
      }
    }

    if (startDate) {
      whereClauses.push('idocs.received_date >= ?');
      queryParams.push(startDate);
    }
    if (endDate) {
      whereClauses.push('idocs.received_date <= ?');
      queryParams.push(endDate);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Query to get total count
    const [countRows] = await connection.query(
      `SELECT COUNT(DISTINCT idocs.id) AS total
       FROM incoming_documents idocs 
       ${whereSql}`, 
      queryParams
    );
    const total = (countRows as RowDataPacket[])[0].total; 

    // Query to get paginated documents with joined external agency and document type names
    // Also join with incoming_document_departments and departments to get all associated department IDs and names
    const [rows] = await connection.query(
      `SELECT
          idocs.id,
          idocs.doc_number,
          idocs.subject,
          idocs.from_agency_id,
          ea.name AS from_agency_name,
          idocs.received_date,
          idocs.document_type_id,
          dt.name AS document_type_name,
          GROUP_CONCAT(DISTINCT idd.department_id ORDER BY idd.department_id ASC) AS received_by_department_ids_str,
          GROUP_CONCAT(DISTINCT d.name ORDER BY d.name ASC) AS received_by_department_name,
          idocs.file_path,
          idocs.created_by_user_id,
          idocs.created_at,
          idocs.updated_at
       FROM
          incoming_documents idocs 
       LEFT JOIN
          external_agencies ea ON idocs.from_agency_id = ea.id
       LEFT JOIN
          document_types dt ON idocs.document_type_id = dt.id
       LEFT JOIN
          incoming_document_departments idd ON idocs.id = idd.incoming_document_id
       LEFT JOIN
          departments d ON idd.department_id = d.id
       ${whereSql}
       GROUP BY
          idocs.id, idocs.doc_number, idocs.subject, idocs.from_agency_id, ea.name, idocs.received_date,
          idocs.document_type_id, dt.name, idocs.file_path, idocs.created_by_user_id, idocs.created_at, idocs.updated_at
       ORDER BY
          idocs.created_at DESC
       LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    );

    // Post-process the data to parse received_by_department_ids_str back to an array of numbers
    const documents = (rows as RowDataPacket[]).map(doc => ({ 
      ...doc,
      received_by_department_ids: doc.received_by_department_ids_str
        ? (doc.received_by_department_ids_str as string).split(',').map(Number) 
        : [],
    }));

    return NextResponse.json({ data: documents, total });
  } catch (error) {
    console.error('Failed to fetch incoming documents (Backend Error):', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// POST: สร้างหนังสือรับใหม่
export async function POST(req: Request) {
  let connection: PoolConnection | undefined;
  try {
    const {
      doc_number,
      subject,
      from_agency_id,
      received_date,
      document_type_id,
      received_by_department_ids, // This will be an array from Frontend
      file_path
    } = await req.json();

    // ดึง userId จาก Header
    const created_by_user_id = await getUserIdFromHeaders(req);
    if (created_by_user_id === null) {
      return NextResponse.json({ message: 'ไม่พบ User ID หรือ User ID ไม่ถูกต้องใน Header', error: 'Unauthorized' }, { status: 401 });
    }

    // --- Role-based authorization for POST ---
    const userAuthInfo = await getUserRoleAndDepartment(created_by_user_id);
    if (!userAuthInfo || (userAuthInfo.role !== 'super_user' && userAuthInfo.role !== 'admin')) {
      return NextResponse.json({ message: 'ไม่ได้รับอนุญาต: คุณไม่มีสิทธิ์ในการสร้างเอกสาร' }, { status: 403 });
    }
    // --- END Role-based authorization ---

    // TODO: เพิ่มการตรวจสอบข้อมูล (Validation) ที่นี่

    connection = await getConnection();
    
    // Start a transaction for atomicity
    await connection.beginTransaction();

    // 1. Insert into incoming_documents table
    const [result] = await connection.execute(
      `INSERT INTO incoming_documents (doc_number, subject, from_agency_id, received_date, document_type_id, file_path, created_by_user_id, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [doc_number, subject, from_agency_id, received_date, document_type_id, file_path, created_by_user_id]
    );
    const newDocumentId = (result as OkPacket).insertId; 

    // 2. Insert into incoming_document_departments junction table
    if (received_by_department_ids && received_by_department_ids.length > 0) {
      const departmentInsertValues = received_by_department_ids.map((deptId: number) => [newDocumentId, deptId]);
      await connection.query(
        `INSERT INTO incoming_document_departments (incoming_document_id, department_id) VALUES ?`,
        [departmentInsertValues]
      );
    }

    await connection.commit(); 

    // Send the newly created data back (re-fetch to get all joined data)
    // This re-fetch is simplified; in a real app, you might construct the full object
    const [newDocRows] = await connection.query(
      `SELECT
          idocs.id,
          idocs.doc_number,
          idocs.subject,
          idocs.from_agency_id,
          ea.name AS from_agency_name,
          idocs.received_date,
          idocs.document_type_id,
          dt.name AS document_type_name,
          GROUP_CONCAT(DISTINCT idd.department_id ORDER BY idd.department_id ASC) AS received_by_department_ids_str,
          GROUP_CONCAT(DISTINCT d.name ORDER BY d.name ASC) AS received_by_department_name,
          idocs.file_path,
          idocs.created_by_user_id,
          idocs.created_at,
          idocs.updated_at
       FROM
          incoming_documents idocs 
       LEFT JOIN
          external_agencies ea ON idocs.from_agency_id = ea.id
       LEFT JOIN
          document_types dt ON idocs.document_type_id = dt.id
       LEFT JOIN
          incoming_document_departments idd ON idocs.id = idd.incoming_document_id
       LEFT JOIN
          departments d ON idd.department_id = d.id
       WHERE idocs.id = ?
       GROUP BY
          idocs.id, idocs.doc_number, idocs.subject, idocs.from_agency_id, ea.name, idocs.received_date,
          idocs.document_type_id, dt.name, idocs.file_path, idocs.created_by_user_id, idocs.created_at, idocs.updated_at`,
      [newDocumentId]
    );

    const newDocument = (newDocRows as RowDataPacket[])[0];
    if (newDocument) {
      newDocument.received_by_department_ids = newDocument.received_by_department_ids_str
        ? (newDocument.received_by_department_ids_str as string).split(',').map(Number)
        : [];
      delete newDocument.received_by_department_ids_str; // Clean up the string version
    }

    return NextResponse.json(newDocument, { status: 201 }); 

  } catch (error) {
    if (connection) {
      await connection.rollback(); 
    }
    console.error('Failed to create incoming document (Backend Error):', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการสร้างเอกสาร', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// PUT: อัปเดตหนังสือรับ
export async function PUT(req: Request) {
  let connection: PoolConnection | undefined;
  try {
    const {
      id,
      doc_number,
      subject,
      from_agency_id,
      received_date,
      document_type_id,
      received_by_department_ids, // This will be an array from Frontend
      file_path
    } = await req.json();

    // ดึง userId จาก Header
    const currentUserId = await getUserIdFromHeaders(req);
    if (currentUserId === null) {
      return NextResponse.json({ message: 'ไม่พบ User ID หรือ User ID ไม่ถูกต้องใน Header', error: 'Unauthorized' }, { status: 401 });
    }

    // --- Role-based authorization for PUT ---
    const userAuthInfo = await getUserRoleAndDepartment(currentUserId);
    if (!userAuthInfo || (userAuthInfo.role !== 'super_user' && userAuthInfo.role !== 'admin')) {
      return NextResponse.json({ message: 'ไม่ได้รับอนุญาต: คุณไม่มีสิทธิ์ในการอัปเดตเอกสาร' }, { status: 403 });
    }
    // --- END Role-based authorization ---

    // TODO: เพิ่มการตรวจสอบข้อมูล (Validation) ที่นี่

    connection = await getConnection();
    
    // Start a transaction for atomicity
    await connection.beginTransaction();

    // 1. Update incoming_documents table
    const [updateDocResult] = await connection.execute( 
      `UPDATE incoming_documents SET doc_number=?, subject=?, from_agency_id=?, received_date=?, document_type_id=?, file_path=?, updated_at=NOW() WHERE id=?`,
      [doc_number, subject, from_agency_id, received_date, document_type_id, file_path, id]
    );

    // 2. Update incoming_document_departments junction table
    // Delete existing entries for this document ID
    await connection.execute('DELETE FROM incoming_document_departments WHERE incoming_document_id = ?', [id]);

    // Insert new entries if received_by_department_ids is provided
    if (received_by_department_ids && received_by_department_ids.length > 0) {
      const departmentInsertValues = received_by_department_ids.map((deptId: number) => [id, deptId]);
      await connection.query(
        `INSERT INTO incoming_document_departments (incoming_document_id, department_id) VALUES ?`,
        [departmentInsertValues]
      );
    }

    await connection.commit(); 

    if ((updateDocResult as OkPacket).affectedRows === 0) {
      return NextResponse.json({ message: 'ไม่พบเอกสารที่ต้องการอัปเดต หรือไม่มีการเปลี่ยนแปลงข้อมูล' }, { status: 404 });
    }

    return NextResponse.json({ message: 'เอกสารถูกอัปเดตเรียบร้อยแล้ว' }, { status: 200 });

  } catch (error) {
    if (connection) {
      await connection.rollback(); 
    }
    console.error('Failed to update incoming document (Backend Error):', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการอัปเดตเอกสาร', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}

// DELETE: ลบหนังสือรับ
export async function DELETE(req: Request) {
  let connection: PoolConnection | undefined;
  try {
    const { id } = await req.json();

    // ดึง userId จาก Header
    const currentUserId = await getUserIdFromHeaders(req);
    if (currentUserId === null) {
      return NextResponse.json({ message: 'ไม่พบ User ID หรือ User ID ไม่ถูกต้องใน Header', error: 'Unauthorized' }, { status: 401 });
    }

    // --- Role-based authorization for DELETE ---
    const userAuthInfo = await getUserRoleAndDepartment(currentUserId);
    if (!userAuthInfo || (userAuthInfo.role !== 'super_user' && userAuthInfo.role !== 'admin')) {
      return NextResponse.json({ message: 'ไม่ได้รับอนุญาต: คุณไม่มีสิทธิ์ในการลบเอกสาร' }, { status: 403 });
    }
    // --- END Role-based authorization ---

    connection = await getConnection();
    
    // Start a transaction for atomicity
    await connection.beginTransaction();

    // 1. Delete related entries in the junction table first
    await connection.execute('DELETE FROM incoming_document_departments WHERE incoming_document_id = ?', [id]);

    // 2. Then delete the document itself
    const [result] = await connection.execute(
      `DELETE FROM incoming_documents WHERE id = ?`,
      [id]
    );

    await connection.commit(); 

    if ((result as OkPacket).affectedRows === 0) {
      return NextResponse.json({ message: 'ไม่พบเอกสารที่ต้องการลบ' }, { status: 404 });
    }

    return NextResponse.json({ message: 'เอกสารถูกลบเรียบร้อยแล้ว' }, { status: 200 });

  } catch (error) {
    if (connection) {
      await connection.rollback(); 
    }
    console.error('Failed to delete incoming document (Backend Error):', error);
    return NextResponse.json({ message: 'เกิดข้อผิดพลาดในการลบเอกสาร', error: (error as Error).message }, { status: 500 });
  } finally {
    if (connection) connection.release();
  }
}
