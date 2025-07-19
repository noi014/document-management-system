// src/app/incoming-documents/page.tsx
'use client';

import { useState, useEffect, useMemo, ChangeEvent, FormEvent, Fragment, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
// Removed: import Image from 'next/image' // 'Image' is defined but never used.
import {
  PlusCircle,
  Pencil,
  Trash2,
  Search,
  // Removed: FileText, // 'FileText' is defined but never used.
  // Removed: CalendarDays, // 'CalendarDays' is defined but never used.
 // UploadCloud,
  XCircle,
  Download,
  // Removed: Info, // 'Info' is defined but never used.
  Loader2,
 // Building2,
 // Building,
  RotateCcw, // Added for reset/clear button
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

// --- Interfaces ---
interface IncomingDocument {
  id: number;
  doc_number: string;
  subject: string;
  from_agency_id: number | null;
  from_agency_name: string | null;
  received_date: string; // This might be ISO string from DB (e.g., "2025-07-08T17:00:00.000Z" or "2025-07-08")
  file_path: string | null;
  document_type_id: number | null;
  document_type_name: string | null;
  // Changed to an array of numbers to support multiple selections
  received_by_department_ids: number[] | null;
  received_by_department_name: string | null; // This might need to be an array of strings or handled differently for display
  created_by_username: string | null;
  created_at: string;
  updated_at: string;
}

interface DocumentType {
  id: number;
  name: string;
}

interface ExternalAgency {
  id: number;
  name: string;
}

interface InternalDepartment {
  id: number;
  name: string;
}

// Helper to get current date in ISO-MM-DD format (local time)
const getTodayDate = (): string => {
  const today = new Date(); // Creates date in local timezone
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Initial form state for adding/editing
const initialFormState = {
  id: 0,
  doc_number: '',
  subject: '',
  from_agency_id: '',
  received_date: getTodayDate(), // Set default to current date
  document_type_id: '',
  // Corrected: Explicitly type as number array
  received_by_department_ids: [] as number[],
  file: null as File | null,
  existing_file_path: null as string | null,
};

// Simple Spinner Component
const Spinner = () => (
  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
);

// --- Helper function to format date to Thai Buddhist Era (Compensating for -1 day issue) ---
const formatDateToThai = (dateString: string | null): string => {
  if (!dateString) return '-';
  try {
    // 1. Extract just the ISO-MM-DD part, removing any time or timezone info
    const cleanDateString = dateString.split('T')[0].split(' ')[0];
    const [year, month, day] = cleanDateString.split('-').map(Number);

    // 2. Create a Date object in the local timezone using date components.
    // Then, add 1 day to compensate for the observed -1 day issue.
    const date = new Date(year, month - 1, day); // Month is 0-indexed
    date.setDate(date.getDate() + 1); // Add 1 day to compensate

    // 3. Calculate Thai Buddhist Year from the adjusted local year
    const thaiYear = date.getFullYear() + 543;

    // 4. Format date parts using Intl.DateTimeFormat
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      // Do NOT specify timeZone here, as the date object has already been adjusted to local time.
    };

    const formattedParts = new Intl.DateTimeFormat('th-TH', options).formatToParts(date);
    let dayPart = '';
    let monthPart = '';
    for (const part of formattedParts) {
      if (part.type === 'day') dayPart = part.value;
      if (part.type === 'month') monthPart = part.value;
    }
    return `${dayPart} ${monthPart} ${thaiYear}`;
  } catch (e) {
    console.error("Error formatting date for display:", e);
    return dateString; // Return original string if parsing/formatting fails
  }
};

// Define styles for document types based on perceived urgency/category
const documentTypeStyles: { [key: string]: string } = {
   'หนังสือลับ': 'bg-red-100 text-red-800',
    'หนังสือลับมาก': 'bg-red-100 text-red-800',
     'หนังสือลับที่สุด': 'bg-red-100 text-red-800',
  'หนังสือด่วนที่สุด': 'bg-red-100 text-red-800',
  'หนังสือด่วนมาก': 'bg-orange-100 text-orange-800',
  'หนังสือด่วน': 'bg-yellow-100 text-yellow-800',
  'หนังสือปกติ': 'bg-blue-100 text-blue-800',
};

// Helper function to get style for document type
const getDocumentTypeStyle = (typeName: string | null): string => {
  if (!typeName) return 'bg-gray-100 text-gray-800'; // Default style if type is null
  return documentTypeStyles[typeName] || 'bg-gray-100 text-gray-800'; // Fallback if type not found in map
};


export default function IncomingDocumentsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth(); // Use useAuth hook
  const [documents, setDocuments] = useState<IncomingDocument[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [externalAgencies, setExternalAgencies] = useState<ExternalAgency[]>([]);
  const [internalDepartments, setInternalDepartments] = useState<InternalDepartment[]>([]);
  const [loading, setLoading] = useState(true); // Loading for document data
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState(initialFormState);
  const [currentFilePreview, setCurrentFilePreview] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState('all');
  const [startDate, setStartDate] = useState(getTodayDate()); // New state for start date search, defaults to today
  const [endDate, setEndDate] = useState(''); // New state for end date search, defaults to empty
  const [searchDepartmentId, setSearchDepartmentId] = useState<string>(''); // New state for searching by department ID
  const [currentPage, setCurrentPage] = useState(1);
  // Corrected: Changed to const as setItemsPerPage is unused and value is fixed
  const itemsPerPage = 5;
  const [totalItems, setTotalItems] = useState(0);

  // New state for "Select All" checkbox for internal departments
  const [selectAllDepartments, setSelectAllDepartments] = useState(false);

  // Derived state for easy checks based on user's role from AuthContext
  const isAdminOrSuperUser = useMemo(() =>
    user?.role === 'super_user' || user?.role === 'admin',
    [user?.role]
  );

  // --- Redirect if not authenticated or not authorized ---
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // If not authenticated, redirect to login
      // router.replace('/auth/login'); // Assuming router is imported and used
      // For now, let's just show a message if not authenticated
      setError('คุณไม่ได้รับอนุญาตให้เข้าถึงหน้านี้ กรุณาเข้าสู่ระบบ');
    }
    // No specific role check here, as 'user' role is allowed to view.
    // Filtering for 'user' role happens in fetchDocuments and backend.
  }, [isAuthenticated, authLoading]);


  // --- Fetch Documents Function (Wrapped with useCallback) ---
  const fetchDocuments = useCallback(async () => {
    // Only fetch documents if authentication info is loaded and user object is available
    if (authLoading || !user) {
      setLoading(true); // Keep loading state true until auth info is ready
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchQuery,
        searchBy: searchBy,
        startDate: startDate, // Pass startDate
        endDate: endDate,     // Pass endDate
      });

      // Conditionally add department_id for 'user' role
      if (user.role === 'user' && user.department_id) {
        params.append('department_id', user.department_id.toString());
      } else if (isAdminOrSuperUser && searchDepartmentId) {
        // For admin/super-user, add searchDepartmentId if selected
        params.append('searchDepartmentId', searchDepartmentId);
      }

      const response = await fetch(`/api/documents/incoming?${params.toString()}`, {
        headers: {
          'X-User-ID': user.id.toString(), // Send currentUserId via header for filtering documents
          'X-User-Role': user.role, // Send user role for backend logic
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch incoming documents');
      }
      const result = await response.json();
      setDocuments(result.data);
      setTotalItems(result.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถโหลดเอกสารได้';
      setError(errorMessage);
      console.error('Error fetching incoming documents:', err);
      setDocuments([]);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด!',
        text: errorMessage || 'ไม่สามารถโหลดเอกสารได้',
        confirmButtonText: 'ตกลง',
      });
    } finally {
      setLoading(false);
    }
  }, [
    authLoading,
    user,
    currentPage,
    itemsPerPage, // itemsPerPage is now a const, but still a dependency for useCallback
    searchQuery,
    searchBy,
    startDate,
    endDate,
    isAdminOrSuperUser,
    searchDepartmentId,
  ]); // Added all dependencies for useCallback

  // --- useEffect to trigger fetchDocuments when dependencies change ---
  useEffect(() => {
    // Only fetch if authLoading is false and user data is available
    if (!authLoading && user) {
      fetchDocuments();
    }
  }, [currentPage, itemsPerPage, searchQuery, searchBy, startDate, endDate, searchDepartmentId, user, authLoading, fetchDocuments]); // Added fetchDocuments to dependencies


  const fetchDocumentTypes = async () => {
    try {
      const response = await fetch('/api/admin/document-types');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch document types');
      }
      const result = await response.json();
      setDocumentTypes(result.data);
    } catch (err) {
       const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถโหลดประเภทเอกสารได้';
      console.error('Error fetching document types:', err);
      setDocumentTypes([]);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด!',
        text: `ไม่สามารถโหลดประเภทเอกสารได้: ${errorMessage}`,
        confirmButtonText: 'ตกลง',
      });
    }
  };

  const fetchExternalAgencies = async () => {
    try {
      const response = await fetch('/api/admin/external-agencies');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch external agencies');
      }
      const result = await response.json();
      setExternalAgencies(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถโหลดหน่วยงานภายนอกได้';
      console.error('Error fetching external agencies:', err);
      setExternalAgencies([]);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด!',
        text: `ไม่สามารถโหลดหน่วยงานภายนอกได้: ${errorMessage}`,
        confirmButtonText: 'ตกลง',
      });
    }
  };

  const fetchInternalDepartments = async () => {
    try {
      const response = await fetch('/api/admin/departments');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch internal departments');
      }
      const result = await response.json();
      if (Array.isArray(result)) {
        setInternalDepartments(result);
      } else if (result && Array.isArray(result.data)) {
        setInternalDepartments(result.data);
      } else {
        console.error('API response for internal departments did not contain an array in "data" property or was not a direct array:', result);
        setInternalDepartments([]);
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด!',
          text: 'รูปแบบข้อมูลหน่วยงานภายในจากเซิร์ฟเวอร์ไม่ถูกต้อง',
          confirmButtonText: 'ตกลง',
        });
      }
    } catch (err) {
       const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถโหลดหน่วยงานภายในได้';
      console.error('Error fetching internal departments:', err);
      setInternalDepartments([]);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด!',
        text: `ไม่สามารถโหลดหน่วยงานภายในได้: ${errorMessage}`,
        confirmButtonText: 'ตกลง',
      });
    }
  };

  // Fetch static data (document types, agencies, departments) once
  useEffect(() => {
    fetchDocumentTypes();
    fetchExternalAgencies();
    fetchInternalDepartments();
  }, []);

  // --- Handlers for Form and Modal ---
  const openModal = (mode: 'add' | 'edit', doc?: IncomingDocument) => {
    // Only allow if user is admin or super user
    if (!isAdminOrSuperUser) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่ได้รับอนุญาต',
        text: 'คุณไม่มีสิทธิ์ในการดำเนินการนี้',
        confirmButtonText: 'ตกลง',
      });
      return;
    }

    setModalMode(mode);
    if (mode === 'edit' && doc) {
      let formattedReceivedDate = '';
      if (doc.received_date) {
        // Ensure we get just the ISO-MM-DD part from the incoming string
        const cleanDateString = doc.received_date.split('T')[0].split(' ')[0];
        const [year, month, day] = cleanDateString.split('-').map(Number);

        // Create a Date object in local time and add 1 day to compensate for the issue.
        const localDate = new Date(year, month - 1, day); // Month is 0-indexed
        localDate.setDate(localDate.getDate() + 1); // Add 1 day to compensate

        // Format this adjusted local Date object back to ISO-MM-DD string
        const localYear = localDate.getFullYear();
        const localMonth = (localDate.getMonth() + 1).toString().padStart(2, '0');
        const localDay = localDate.getDate().toString().padStart(2, '0');
        formattedReceivedDate = `${localYear}-${localMonth}-${localDay}`;
      }

      // Handle received_by_department_ids for edit mode
      let initialDepartmentIds: number[] = [];
      if (doc.received_by_department_ids) {
        initialDepartmentIds = Array.isArray(doc.received_by_department_ids)
          ? doc.received_by_department_ids
          : [doc.received_by_department_ids as number]; // Cast to number if it was a single ID
      } else if (doc.received_by_department_name) { // Fallback if IDs are missing but name exists (less reliable)
        const matchedDept = internalDepartments.find(d => d.name === doc.received_by_department_name);
        if (matchedDept) {
          initialDepartmentIds = [matchedDept.id];
        }
      }

      setFormData({
        id: doc.id,
        doc_number: doc.doc_number,
        subject: doc.subject,
        from_agency_id: doc.from_agency_id ? String(doc.from_agency_id) : '',
        received_date: formattedReceivedDate, // <-- This value is now guaranteed ISO-MM-DD
        document_type_id: doc.document_type_id ? String(doc.document_type_id) : '',
        // Set the array of selected department IDs
        received_by_department_ids: initialDepartmentIds,
        file: null,
        existing_file_path: doc.file_path, // Use doc.file_path here
      });
      setCurrentFilePreview(doc.file_path);
    } else {
      setFormData(initialFormState);
      setCurrentFilePreview(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
    setCurrentFilePreview(null);
    setSelectAllDepartments(false); // Reset "Select All" state on modal close
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, file: e.target.files![0] }));
      setCurrentFilePreview(URL.createObjectURL(e.target.files[0]));
    } else {
      setFormData(prev => ({ ...prev, file: null }));
      setCurrentFilePreview(formData.existing_file_path);
    }
  };

  const handleRemoveFile = () => {
    setFormData(prev => ({ ...prev, file: null, existing_file_path: null }));
    setCurrentFilePreview(null);
    // Also clear the file input element's value
    const fileInput = document.getElementById('file') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // Handler for individual department checkbox changes
  const handleDepartmentChange = (departmentId: number) => {
    setFormData(prevFormData => {
      const currentSelected = prevFormData.received_by_department_ids || [];
      let newSelected: number[];

      if (currentSelected.includes(departmentId)) {
        // If already selected, remove it
        newSelected = currentSelected.filter((id) => id !== departmentId);
      } else {
        // Otherwise, add it to the selected list
        newSelected = [...currentSelected, departmentId];
      }

      return {
        ...prevFormData,
        received_by_department_ids: newSelected,
      };
    });
  };

  // Handler for "Select All" departments checkbox change
  const handleSelectAllDepartmentsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    setSelectAllDepartments(isChecked);

    setFormData(prevFormData => {
      return {
        ...prevFormData,
        received_by_department_ids: isChecked ? internalDepartments.map((dept) => dept.id) : [],
      };
    });
  };

  // Effect to update "Select All" checkbox based on individual selections
  useEffect(() => {
    // If the number of selected departments equals the total number of departments,
    // and there are departments available, then "Select All" should be checked.
    if (formData.received_by_department_ids?.length === internalDepartments.length && internalDepartments.length > 0) {
      setSelectAllDepartments(true);
    } else {
      setSelectAllDepartments(false);
    }
  }, [formData.received_by_department_ids, internalDepartments]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true); // Use setLoading for form submission too
    let uploadedFilePath: string | null = formData.existing_file_path;

    // Pre-check authorization for Add/Edit
    if (!isAdminOrSuperUser) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่ได้รับอนุญาต',
        text: 'คุณไม่มีสิทธิ์ในการดำเนินการนี้',
        confirmButtonText: 'ตกลง',
      });
      setLoading(false);
      return;
    }

    try {
      if (formData.file) {
        const fileFormData = new FormData();
        fileFormData.append('file', formData.file);
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: fileFormData,
        });
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'File upload failed');
        }
        const uploadResult = await uploadResponse.json();
        uploadedFilePath = uploadResult.filePath;
      } else if (formData.existing_file_path === null && currentFilePreview === null && modalMode === 'edit') {
        uploadedFilePath = null; // If file was removed in edit mode
      }

      const dataToSubmit = {
        doc_number: formData.doc_number.trim(),
        subject: formData.subject.trim(),
        from_agency_id: formData.from_agency_id ? parseInt(formData.from_agency_id) : null,
        received_date: formData.received_date,
        document_type_id: formData.document_type_id ? parseInt(formData.document_type_id) : null,
        // Send the array of department IDs
        received_by_department_ids: formData.received_by_department_ids,
        file_path: uploadedFilePath,
        // created_by_user_id will be inferred from the X-User-ID header on the backend
      };

      let response;
      if (modalMode === 'add') {
        response = await fetch('/api/documents/incoming', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': user?.id.toString() || '', // Send currentUserId via header
            'X-User-Role': user?.role || '', // Send user role for backend logic
          },
          body: JSON.stringify(dataToSubmit),
        });
      } else {
        response = await fetch('/api/documents/incoming', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
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
        text: `หนังสือรับถูก${modalMode === 'add' ? 'เพิ่ม' : 'อัปเดต'}เรียบร้อยแล้ว`,
        confirmButtonText: 'ตกลง',
      });
      closeModal();
      fetchDocuments();
    } catch (err) {
       const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถดำเนินการได้';
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด!',
        text: errorMessage || 'ไม่สามารถดำเนินการได้',
        confirmButtonText: 'ตกลง',
      });
      console.error('Submission error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    // Only allow if user is admin or super user
    if (!isAdminOrSuperUser) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่ได้รับอนุญาต',
        text: 'คุณไม่มีสิทธิ์ในการดำเนินการนี้',
        confirmButtonText: 'ตกลง',
      });
      return;
    }
    Swal.fire({
      title: 'คุณแน่ใจหรือไม่?',
      text: 'คุณจะไม่สามารถกู้คืนเอกสารนี้ได้!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก',
    }).then(async (result) => {
      if (result.isConfirmed) {
        setLoading(true);
        try {
          const response = await fetch('/api/documents/incoming', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'X-User-ID': user?.id.toString() || '', // Send currentUserId via header
              'X-User-Role': user?.role || '', // Send user role for backend logic
            },
            body: JSON.stringify({ id }),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Deletion failed');
          }
          Swal.fire('ลบสำเร็จ!', 'เอกสารถูกลบเรียบร้อยแล้ว', 'success');
          fetchDocuments();
        } catch (err) {
           const errorMessage = err instanceof Error ? err.message : 'ไม่สามารถลบเอกสารได้';
          Swal.fire('เกิดข้อผิดพลาด!', errorMessage || 'ไม่สามารถลบเอกสารได้', 'error');
          console.error('Deletion error:', err);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // fetchDocuments will be triggered by useEffect due to searchQuery/searchBy/startDate/endDate/searchDepartmentId change
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchBy('all');
    setStartDate(getTodayDate());
    setEndDate('');
    setSearchDepartmentId('');
    setCurrentPage(1); // fetchDocuments will be triggered by useEffect
  };

  const totalPages = useMemo(() => Math.ceil(totalItems / itemsPerPage), [totalItems, itemsPerPage]);

  // If authentication info is still loading, show a loading message
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen text-blue-600">
        <Spinner />
        <span className="ml-2">กำลังโหลดข้อมูลผู้ใช้...</span>
      </div>
    );
  }

  // If not authenticated, show an error message. (Redirect handled by ResponsiveSidebar's useEffect)
  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen text-red-600">
        <span className="ml-2">คุณไม่ได้รับอนุญาตให้เข้าถึงหน้านี้ กรุณาเข้าสู่ระบบ</span>
      </div>
    );
  }

  return (
    <div>
      <div className="container mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">จัดการหนังสือรับ</h1>
        {/* Display Current User Info (based on fetched role) */}
        <div className="mb-6 flex items-center justify-end gap-3 p-3 bg-blue-50 rounded-lg shadow-sm border border-blue-100">
          <span className="text-sm font-medium text-blue-800">
            ผู้ใช้ปัจจุบัน: <span className="font-semibold">{user?.username} (ID: {user?.id}) {user?.role === 'admin' ? 'ผู้ดูแลระบบ' : user?.role === 'super_user' ? 'หัวหน้างาน' : 'ผู้ใช้งาน'} {user?.department_name ? `แผนก: ${user.department_name}` : ''}</span>
          </span>
        </div>
        {/* Action Bar: Search and Add Button */}
        <div className="mb-6 p-6 bg-white rounded-xl shadow-lg border border-gray-100">
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 items-end">
            {/* Search Query Input */}
            <div className={`${isAdminOrSuperUser ? '' : 'sm:col-span-2 lg:col-span-2 xl:col-span-2'}`}> {/* Adjusted span for user role */}
              <label htmlFor="searchQuery" className="block text-sm font-medium text-gray-700 mb-1">
                ค้นหา (เลขที่/เรื่อง)
              </label>
              <input
                type="text"
                id="searchQuery"
                placeholder="เลขที่/เรื่อง..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
            {/* Search By Select */}
            <div>
              <label htmlFor="searchBy" className="block text-sm font-medium text-gray-700 mb-1">
                ค้นหาโดย
              </label>
              <select
                id="searchBy"
                value={searchBy}
                onChange={(e) => setSearchBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
              >
                <option value="all">ทั้งหมด (เลขที่/เรื่อง)</option>
                <option value="doc_number">เลขที่หนังสือ</option>
                <option value="subject">เรื่อง</option>
              </select>
            </div>
            {/* Start Date Input */}
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                วันที่รับ (จาก)
              </label>
              <input
                type="date"
                name="startDate"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
            {/* End Date Input */}
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                วันที่รับ (ถึง)
              </label>
              <input
                type="date"
                name="endDate"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
            {/* Search by Internal Department (visible for Admin/Super User) */}
            {isAdminOrSuperUser && (
              <div>
                <label htmlFor="searchDepartmentId" className="block text-sm font-medium text-gray-700 mb-1">
                  หน่วยงานภายในที่รับ
                </label>
                <select
                  id="searchDepartmentId"
                  value={searchDepartmentId}
                  onChange={(e) => setSearchDepartmentId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                >
                  <option value="">ทั้งหมด</option>
                  {internalDepartments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {/* Search and Clear Buttons */}
            <div className="flex gap-2 col-span-1 sm:col-span-2 lg:col-span-1">
              <button
                type="submit"
                className="flex-1 inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
              >
                <Search className="h-5 w-5 mr-2" />
                ค้นหา
              </button>
              <button
                type="button"
                onClick={handleClearSearch}
                className="flex-shrink-0 inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
              >
                <RotateCcw className="h-5 w-5" /> {/* Reset icon */}
              </button>
            </div>
            {/* Add New Document Button (visible for Admin/Super User) */}
            {isAdminOrSuperUser && (
              <div className="sm:col-span-2 lg:col-span-1 xl:col-start-5 xl:row-start-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => openModal('add')}
                  className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  <PlusCircle className="h-5 w-5 mr-2" />
                  เพิ่มหนังสือรับใหม่
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Loading and Error States */}
        {loading && (
          <div className="flex justify-center items-center py-8">
            <Spinner />
            <span className="ml-2 text-gray-600">กำลังโหลดข้อมูลเอกสาร...</span>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-8 text-red-500">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && documents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>ไม่พบหนังสือรับในระบบ</p>
          </div>
        )}

        {/* Documents Table */}
        {!loading && !error && documents.length > 0 && (
          <>
            <div className="overflow-x-auto shadow-md sm:rounded-lg mb-6">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เลขที่หนังสือ
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      เรื่อง
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      หน่วยงานต้นทาง
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่รับ
                    </th>
                    {/* <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ประเภทเอกสาร
                    </th> */}
                    {/* <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ไฟล์แนบ
                    </th> */}
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      หน่วยงานที่รับ
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                    {/* <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ผู้สร้าง
                    </th> */}
                    {/* <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th> */}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {doc.doc_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {doc.subject}
                         <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDocumentTypeStyle(doc.document_type_name)}`}>
                          {doc.document_type_name || '-'}
                        </span>
                        {doc.file_path ? (
                          <a
                            href={doc.file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            ดูไฟล์
                          </a>
                        ) : (
                          <span className="text-gray-500">ไม่มีไฟล์</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {doc.from_agency_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatDateToThai(doc.received_date)}
                      </td>
                      {/* <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDocumentTypeStyle(doc.document_type_name)}`}>
                          {doc.document_type_name || '-'}
                        </span>
                      </td> */}
                      {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {doc.file_path ? (
                          <a
                            href={doc.file_path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            ดูไฟล์
                          </a>
                        ) : (
                          <span className="text-gray-500">ไม่มีไฟล์</span>
                        )}
                      </td> */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {doc.received_by_department_name || '-'}
                      </td>
                      {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {doc.created_by_username || '-'}
                      </td> */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {isAdminOrSuperUser && (
                          <>
                            <button
                              onClick={() => openModal('edit', doc)}
                              className="text-indigo-600 hover:text-indigo-900 mr-4"
                              title="แก้ไข"
                            >
                              <Pencil className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="text-red-600 hover:text-red-900"
                              title="ลบ"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </>
                        )}
                        {!isAdminOrSuperUser && (
                           <span className="text-gray-400">ไม่มีสิทธิ์</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <nav
              className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
              aria-label="Pagination"
            >
              <div className="hidden sm:block">
                <p className="text-sm text-gray-700">
                  แสดง <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> ถึง{' '}
                  <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> จาก{' '}
                  <span className="font-medium">{totalItems}</span> รายการ
                </p>
              </div>
              <div className="flex flex-1 justify-between sm:justify-end">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ก่อนหน้า
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ถัดไป
                </button>
              </div>
            </nav>
          </>
        )}
      </div>

      {/* Modal for Add/Edit */}
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center"
                  >
                    {modalMode === 'add' ? 'เพิ่มหนังสือรับใหม่' : 'แก้ไขหนังสือรับ'}
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent px-2 py-1 text-sm font-medium text-gray-400 hover:bg-gray-100"
                      onClick={closeModal}
                    >
                      <XCircle className="h-6 w-6" />
                    </button>
                  </Dialog.Title>
                  <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-y-4">
                    {/* Document Number */}
                    <div>
                      <label htmlFor="doc_number" className="block text-sm font-medium text-gray-700">
                        เลขที่หนังสือ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="doc_number"
                        id="doc_number"
                        value={formData.doc_number}
                        onChange={handleChange}
                        required
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                         
                      />
                    </div>

                    {/* Subject */}
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                        เรื่อง <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="subject"
                        id="subject"
                        rows={3}
                        value={formData.subject}
                        onChange={handleChange}
                        required
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                         
                     ></textarea>
                    </div>

                    {/* From Agency */}
                    <div>
                      <label htmlFor="from_agency_id" className="block text-sm font-medium text-gray-700">
                        หน่วยงานต้นทาง
                      </label>
                      <select
                        name="from_agency_id"
                        id="from_agency_id"
                        value={formData.from_agency_id}
                        onChange={handleChange}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                         
                      >
                        <option value="">เลือกหน่วยงาน</option>
                        {externalAgencies.map((agency) => (
                          <option key={agency.id} value={agency.id}>
                            {agency.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Received Date */}
                    <div>
                      <label htmlFor="received_date" className="block text-sm font-medium text-gray-700">
                        วันที่รับ <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="received_date"
                        id="received_date"
                        value={formData.received_date}
                        onChange={handleChange}
                        required
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                         
                      />
                    </div>

                    {/* Document Type */}
                    <div>
                      <label htmlFor="document_type_id" className="block text-sm font-medium text-gray-700">
                        ประเภทเอกสาร
                      </label>
                      <select
                        name="document_type_id"
                        id="document_type_id"
                        value={formData.document_type_id}
                        onChange={handleChange}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                         
                      >
                        <option value="">เลือกประเภทเอกสาร</option>
                        {documentTypes.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Received by Department Multi-select Checkboxes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        หน่วยงานภายในที่รับ (สามารถเลือกได้หลายรายการ)
                      </label>
                      <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto">
                        <div className="mb-2">
                          <input
                            type="checkbox"
                            id="selectAllDepartments"
                            checked={selectAllDepartments}
                            onChange={handleSelectAllDepartmentsChange}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="selectAllDepartments" className="ml-2 text-sm font-medium text-gray-900">
                            เลือกทั้งหมด
                          </label>
                        </div>
                        {internalDepartments.map((dept) => (
                          <div key={dept.id} className="flex items-center mb-1">
                            <input
                              type="checkbox"
                              id={`dept-${dept.id}`}
                              value={dept.id}
                              checked={formData.received_by_department_ids?.includes(dept.id)}
                              onChange={() => handleDepartmentChange(dept.id)}
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor={`dept-${dept.id}`} className="ml-2 text-sm text-gray-700">
                              {dept.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* File Upload */}
                    <div>
                      <label htmlFor="file" className="block text-sm font-medium text-gray-700">
                        ไฟล์แนบ (PDF, DOCX, JPG, PNG)
                      </label>
                      <input
                        type="file"
                        name="file"
                        id="file"
                        onChange={handleFileChange}
                        className="mt-1 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                      />
                      {(currentFilePreview || formData.existing_file_path) ? (
                        <div className="mt-2 flex items-center justify-between p-2 border border-gray-200 rounded-md bg-gray-50">
                          <span className="text-sm text-gray-700 truncate mr-2">
                            {formData.file?.name || formData.existing_file_path?.split('/').pop()}
                          </span>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="text-red-500 hover:text-red-700"
                            title="ลบไฟล์"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="mt-2 text-sm text-gray-500">
                          ไม่มีไฟล์แนบ
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex justify-end col-span-2 space-x-3">
                      <button
                        type="button"
                        onClick={closeModal}
                        className="inline-flex justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus:visible:ring-blue-500 focus:visible:ring-offset-2"
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
  );
}