import React, { useState } from 'react';
import AdminFaqsTab from './AdminFaqsTab';
import AdminFaqModal from './modals/AdminFaqModal';
import { useQuery } from '../../hooks/useQuery';
import { useApi } from '../../hooks/useApi';

const AdminFaqsContainer = ({
  BACKEND_URL,
  headers,
  showConfirm,
  setToastMessage,
  setShowSuccessToast,
  refetchData // Optional, if parent still wants to trigger global refetch
}) => {
  const { fetchWithRetry } = useApi();

  const { data: faqsData, loading: faqsLoading, refetch: refetchFaqs } = useQuery('admin-faqs', `${BACKEND_URL}/api/admin/faqs`, { headers });
  const faqsList = faqsData?.faqs || [];
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);

  const handleSaveFaq = async () => {
    try {
      const isEdit = !!editingFaq.id;
      const url = isEdit ? `${BACKEND_URL}/api/admin/faqs/${editingFaq.id}` : `${BACKEND_URL}/api/admin/faqs`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetchWithRetry(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(editingFaq)
      });

      if (res.success) {
        setIsFaqModalOpen(false);
        refetchFaqs();
        if (refetchData) refetchData(true);
        setToastMessage('រក្សាទុក FAQ ជោគជ័យ!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2500);
      }
    } catch (err) {
      alert('បរាជ័យក្នុងការរក្សាទុក FAQ: ' + err.message);
    }
  };

  const handleDeleteFaq = (id) => {
    showConfirm('តើអ្នកពិតជាចង់លុបសំណួរនេះមែនទេ?', () => {
      fetchWithRetry(`${BACKEND_URL}/api/admin/faqs/${id}`, {
        method: 'DELETE',
        headers
      }).then(() => {
        refetchFaqs();
        if (refetchData) refetchData(true);
        setToastMessage('លុប FAQ ជោគជ័យ!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2500);
      });
    }, '🗑️');
  };

  return (
      <AdminFaqsTab
        faqsList={faqsList}
        faqsLoading={faqsLoading}
        editingFaq={editingFaq}
        setEditingFaq={setEditingFaq}
        isFaqModalOpen={isFaqModalOpen}
        setIsFaqModalOpen={setIsFaqModalOpen}
        handleDeleteFaq={handleDeleteFaq}
        handleSaveFaq={handleSaveFaq}
      />
  );
};

export default AdminFaqsContainer;
