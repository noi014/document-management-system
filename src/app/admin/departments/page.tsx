// src/app/admin/departments/page.tsx
'use client';

import { useState, useEffect, useMemo, ChangeEvent, FormEvent, Fragment, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  PlusCircle,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useRouter, usePathname } from 'next/navigation';
import ResponsiveSidebar from '@/components/ResponsiveSidebar';
import { useAuth } from '@/context/AuthContext';

// Spinner Component
const Spinner = () => (
  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
);

// Interface for Department data
interface Department {
  id: number;
  name: string;
}

// Type for request body
type DepartmentRequestBody = {
  name: string;
  id?: number;
};

// Initial form state for adding/editing
const initialFormState: Department = {
  id: 0,
  name: '',
};

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState<Department>(initialFormState);

  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const canManageDepartments = useMemo(() => {
    return user?.role === 'admin' || user?.role === 'super_user';
  }, [user]);

  const fetchDepartments = useCallback(async () => {
    if (!isAuthenticated || !user) {
        setLoading(false);
        return;
    }
    setLoading(true);
    setError(null);
    try {
      // const requestHeaders: Record<string, string> = {
      //   'X-User-ID': user.id.toString(),
      // };
      //   const response = await fetch('/api/admin/departments', { headers: requestHeaders });
       const response = await fetch('/api/admin/departments', {
            headers: {
              'Content-Type': 'application/json',
            //  'X-User-ID': user.id.toString(), // Ensure X-User-ID is sent
                  'X-User-ID': user?.id.toString() || '', // Send currentUserId via header
                  'X-User-Role': user?.role || '', // Send user role for backend logic
            }
          });

    

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!Array.isArray(result)) {
        console.error('API response for departments did not contain an array:', result);
        throw new Error('รูปแบบข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง');
      }

      setDepartments(result);
    } catch (err) {
      // ✅ FIX: Error handling without 'any'
      const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถดึงข้อมูลแผนกได้';
      setError(errorMessage);
      Swal.fire('ข้อผิดพลาด', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    const publicPaths = ['/auth/login', '/auth/register'];
    if (!authLoading && !isAuthenticated && !publicPaths.includes(pathname)) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, authLoading, pathname, router]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
        <p className="ml-2 text-lg text-blue-600">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!canManageDepartments) {
    return (
      <ResponsiveSidebar>
        <div className="flex justify-center items-center h-screen">
          <p className="text-lg text-red-500">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
        </div>
      </ResponsiveSidebar>
    );
  }

  const openAddModal = () => {
    setModalMode('add');
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setModalMode('edit');
    setFormData({ ...dept });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      Swal.fire('ข้อผิดพลาด', 'กรุณากรอกชื่อหน่วยงานภายใน', 'error');
      return;
    }

    setLoading(true);
    setError(null);

    const url = '/api/admin/departments';
    const method = modalMode === 'edit' ? 'PUT' : 'POST';
    const bodyData: DepartmentRequestBody = { name: formData.name.trim() };

    if (modalMode === 'edit') {
      bodyData.id = formData.id;
    }

    try {
      const requestHeaders: HeadersInit = {
        'Content-Type': 'application/json',
         'X-User-ID': user?.id.toString() || '', // Send currentUserId via header
        'X-User-Role': user?.role || '', // Send user role for backend logic
      };

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: JSON.stringify(bodyData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      Swal.fire('สำเร็จ!', 'บันทึกข้อมูลหน่วยงานภายในเรียบร้อยแล้ว', 'success');
      closeModal();
      fetchDepartments();
    } catch (err) {
      // ✅ FIX: Error handling without 'any'
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      setError(errorMessage);
      Swal.fire('ข้อผิดพลาด', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const result = await Swal.fire({
      title: 'คุณแน่ใจหรือไม่?',
      text: 'คุณต้องการลบหน่วยงานภายในนี้ใช่หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก',
    });
    
    if (result.isConfirmed) {
        setLoading(true);
        setError(null);
        try {
          const requestHeaders: HeadersInit = {
            'Content-Type': 'application/json',
              'X-User-ID': user?.id.toString() || '', // Send currentUserId via header
            'X-User-Role': user?.role || '', // Send user role for backend logic
          }; 

          const response = await fetch('/api/admin/departments', {
            method: 'DELETE',
            headers: requestHeaders,
            body: JSON.stringify({ id }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
          }

          Swal.fire('ลบสำเร็จ!', 'หน่วยงานภายในถูกลบแล้ว', 'success');
          fetchDepartments();
        } catch (err) {
          // ✅ FIX: Error handling without 'any'
          const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบข้อมูล';
          setError(errorMessage);
          Swal.fire('ข้อผิดพลาด', errorMessage, 'error');
        } finally {
          setLoading(false);
        }
      }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <ResponsiveSidebar>
      <div>
        <div className="container mx-auto bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">จัดการหน่วยงานภายใน</h1>

          <div className="mb-6 flex justify-end">
            <button
              onClick={openAddModal}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 w-full sm:w-auto justify-center"
            >
              <PlusCircle className="w-5 h-5 mr-2" /> เพิ่มหน่วยงานภายใน
            </button>
          </div>

          {loading && (
            <div className="flex justify-center items-center py-4 text-blue-600">
              <Spinner />
              <span className="ml-2">กำลังโหลดข้อมูล...</span>
            </div>
          )}
          {error && <div className="text-center py-4 text-red-600">เกิดข้อผิดพลาด: {error}</div>}

          {!loading && !error && (
            <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อหน่วยงานภายใน</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {departments.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        ไม่พบข้อมูลหน่วยงานภายใน
                      </td>
                    </tr>
                  ) : (
                    departments.map((dept) => (
                      <tr key={dept.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{dept.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{dept.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openEditModal(dept)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-50"
                              title="แก้ไข"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(dept.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                              title="ลบ"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        <Transition appear show={isModalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-50" onClose={closeModal}>
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
              <div className="fixed inset-0 bg-black bg-opacity-25" />
            </Transition.Child>
            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 border-b pb-3 mb-4">
                      {modalMode === 'add' ? 'เพิ่มหน่วยงานภายในใหม่' : 'แก้ไขหน่วยงานภายใน'}
                    </Dialog.Title>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">ชื่อหน่วยงานภายใน</label>
                        <input
                          type="text"
                          name="name"
                          id="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                          required
                        />
                      </div>
                      <div className="mt-4 flex justify-end space-x-3">
                        <button type="button" onClick={closeModal} className="inline-flex justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2">ยกเลิก</button>
                        <button type="submit" className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                          {loading ? 'กำลังบันทึก...' : (modalMode === 'add' ? 'เพิ่ม' : 'บันทึก')}
                        </button>
                      </div>
                    </form>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      </div>
    </ResponsiveSidebar>
  );
}