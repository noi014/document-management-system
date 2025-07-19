'use client';

// FIX 1: Removed 'useMemo' as it was not used.
import { useState, useEffect, ChangeEvent, FormEvent, Fragment,useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  PlusCircle,
  Pencil,
  Trash2,
  Loader2, // For loading spinner
  // FIX 2: Removed 'Info' icon as it was not used.
} from 'lucide-react';
import Swal from 'sweetalert2';
import ResponsiveSidebar from '@/components/ResponsiveSidebar';
import { useAuth } from '@/context/AuthContext';
// --- Interfaces ---
interface DocumentType {
  id: number;
  name: string;
}

const initialFormState = {
  id: 0,
  name: '',
};

// Simple Spinner Component
const Spinner = () => (
  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
);

export default function DocumentTypesPage() {
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState(initialFormState);
 const { user } = useAuth();
  // --- Fetch Data ---

  const fetchDocumentTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/document-types',{
          headers: {
              'Content-Type': 'application/json',
            //  'X-User-ID': user.id.toString(), // Ensure X-User-ID is sent
                  'X-User-ID': user?.id.toString() || '', // Send currentUserId via header
                  'X-User-Role': user?.role || '', // Send user role for backend logic
            }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch document types');
      }
      const result = await response.json();
      setDocumentTypes(result.data);
    } catch (err) {
      // FIX 3: Handled error type safely without using 'any'.
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching document types:', err);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด!',
        text: `ไม่สามารถโหลดประเภทเอกสารได้: ${errorMessage}`,
        confirmButtonText: 'ตกลง',
      });
    } finally {
      setLoading(false);
    }
  }, [ user]);

  useEffect(() => {
    fetchDocumentTypes();
  }, [fetchDocumentTypes]);

  // --- Handlers for Form and Modal ---
  const openModal = (mode: 'add' | 'edit', type?: DocumentType) => {
    setModalMode(mode);
    if (mode === 'edit' && type) {
      setFormData({
        id: type.id,
        name: type.name,
      });
    } else {
      setFormData(initialFormState);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSubmit = {
        name: formData.name.trim(),
      };

      let response;
      if (modalMode === 'add') {
        response = await fetch('/api/admin/document-types', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
            //  'X-User-ID': user.id.toString(), // Ensure X-User-ID is sent
                  'X-User-ID': user?.id.toString() || '', // Send currentUserId via header
                  'X-User-Role': user?.role || '', // Send user role for backend logic
            },
          body: JSON.stringify(dataToSubmit),
        });
      } else {
        response = await fetch('/api/admin/document-types', {
          method: 'PUT',
          headers: {
              'Content-Type': 'application/json',
            //  'X-User-ID': user.id.toString(), // Ensure X-User-ID is sent
                  'X-User-ID': user?.id.toString() || '', // Send currentUserId via header
                  'X-User-Role': user?.role || '', // Send user role for backend logic
            },
          body: JSON.stringify({ ...dataToSubmit, id: formData.id }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Operation failed');
      }

      Swal.fire({
        icon: 'success',
        title: 'สำเร็จ!',
        text: `ประเภทเอกสารถูก${modalMode === 'add' ? 'เพิ่ม' : 'อัปเดต'}เรียบร้อยแล้ว`,
        confirmButtonText: 'ตกลง',
      });
      closeModal();
      fetchDocumentTypes();
    } catch (err) {
      // FIX 4: Handled error type safely without using 'any'.
      const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถดำเนินการได้';
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด!',
        text: errorMessage,
        confirmButtonText: 'ตกลง',
      });
      console.error('Submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    Swal.fire({
      title: 'คุณแน่ใจหรือไม่?',
      text: "คุณจะไม่สามารถกู้คืนประเภทเอกสารนี้ได้!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        try {
          const response = await fetch('/api/admin/document-types', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            //  'X-User-ID': user.id.toString(), // Ensure X-User-ID is sent
                  'X-User-ID': user?.id.toString() || '', // Send currentUserId via header
                  'X-User-Role': user?.role || '', // Send user role for backend logic
            },
            body: JSON.stringify({ id }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Deletion failed');
          }

          Swal.fire('ลบสำเร็จ!', 'ประเภทเอกสารถูกลบเรียบร้อยแล้ว', 'success');
          fetchDocumentTypes();
        } catch (err) {
          // FIX 5: Handled error type safely without using 'any'.
          const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถลบประเภทเอกสารได้';
          Swal.fire('เกิดข้อผิดพลาด!', errorMessage, 'error');
          console.error('Deletion error:', err);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <ResponsiveSidebar>
      <div >
        <div className="container mx-auto bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">จัดการประเภทเอกสาร</h1>

          <div className="mb-6 flex justify-end">
            <button
              onClick={() => openModal('add')}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200"
            >
              <PlusCircle className="w-5 h-5 mr-2" /> เพิ่มประเภทเอกสาร
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
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ชื่อประเภทเอกสาร
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documentTypes.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        ไม่พบประเภทเอกสาร
                      </td>
                    </tr>
                  ) : (
                    documentTypes.map((type) => (
                      <tr key={type.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {type.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                          {type.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openModal('edit', type)}
                              className="text-indigo-600 hover:text-indigo-900 p-1 rounded-md hover:bg-indigo-50"
                              title="แก้ไข"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(type.id)}
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
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-25" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900 border-b pb-3 mb-4"
                    >
                      {modalMode === 'add' ? 'เพิ่มประเภทเอกสารใหม่' : 'แก้ไขประเภทเอกสาร'}
                    </Dialog.Title>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">ชื่อประเภทเอกสาร</label>
                        <input
                          type="text"
                          name="name"
                          id="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                          required
                        />
                      </div>
                      
                      <div className="mt-4 flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={closeModal}
                          className="inline-flex justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="submit"
                          className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                        >
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