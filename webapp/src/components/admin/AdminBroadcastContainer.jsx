import React, { useState } from 'react';
import AdminBroadcastTab from './AdminBroadcastTab';
import { useApi } from '../../hooks/useApi';
import { compressImage } from '../../utils/imageUtils';

const AdminBroadcastContainer = ({
  BACKEND_URL,
  headers,
  setToastMessage,
  setShowSuccessToast,
}) => {
  const { fetchWithRetry } = useApi();
  
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastImage, setBroadcastImage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const handleBroadcastUpload = async (file) => {
    const formData = new FormData();
    const compressed = await compressImage(file);
    formData.append('image', compressed);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/upload`, { method: 'POST', headers: headers, body: formData });
      if (res.success) setBroadcastImage(res.data?.url || res.url);
    } catch (err) {
      console.error('Failed to upload image', err);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim() && !broadcastImage) return;
    setIsBroadcasting(true);
    try {
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Bypass': 'true', ...headers },
        body: JSON.stringify({ message: broadcastMsg, photoUrl: broadcastImage })
      });
      if (res.success) {
        setToastMessage(`បានផ្ញើដល់ Telegram (${res.data?.count || 0} នាក់) + App`);
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
        setBroadcastMsg('');
        setBroadcastImage('');
      } else {
        alert('បរាជ័យក្នុងការផ្ញើ Broadcast');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally { setIsBroadcasting(false); }
  };

  return (
    <AdminBroadcastTab
      broadcastMsg={broadcastMsg}
      setBroadcastMsg={setBroadcastMsg}
      broadcastImage={broadcastImage}
      setBroadcastImage={setBroadcastImage}
      handleBroadcastUpload={handleBroadcastUpload}
      handleBroadcast={handleBroadcast}
      isBroadcasting={isBroadcasting}
    />
  );
};

export default AdminBroadcastContainer;
