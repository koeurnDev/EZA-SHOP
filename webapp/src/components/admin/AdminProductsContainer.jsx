import React, { useState } from 'react';
import AdminProductsTab from './AdminProductsTab';
import AdminAddProductModal from './modals/AdminAddProductModal';
import AdminEditProductModal from './modals/AdminEditProductModal';
import { useShopDispatch } from '../../context/ShopContext';
import { useApi } from '../../hooks/useApi';
import { compressImage } from '../../utils/imageUtils';
import ProductDetail from '../ProductDetail';
import { useTelegram } from '../../context/TelegramContext';
import { parseProductSections } from '../../utils/productContentUtils';

// Merge description + howToUse + ingredients back into a single string with markers
const buildDescription = ({ description, howToUse, ingredients }) => {
  let result = (description || '').trim();
  if (howToUse && howToUse.trim()) result += `\n[HOW_TO_USE]\n${howToUse.trim()}`;
  if (ingredients && ingredients.trim()) result += `\n[INGREDIENTS]\n${ingredients.trim()}`;
  return result;
};

const EMPTY_NEW_PRODUCT = {
  name: '', price: '', stock: '', category: 'ទឹកអប់ (Perfume)',
  image: '', description: '', howToUse: '', ingredients: '',
  additional_images: [], flash_sale_price: '', flash_sale_end: '', video_url: ''
};

const AdminProductsContainer = ({
  BACKEND_URL,
  headers,
  products,
  categories,
  showConfirm,
  showAlert,
  setToastMessage,
  setShowSuccessToast,
  refetchData,
  mutateDashboard,
  productSearchTerm,
  localProductSearchTerm,
  setLocalProductSearchTerm,
  visibleProductLimit,
  setVisibleProductLimit
}) => {
  const { fetchWithRetry } = useApi();
  const { refetchData: refetchShopData, mutateShopData } = useShopDispatch();

  const [isSaving, setIsSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', price: '', stock: '', howToUse: '', ingredients: '' });
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductData, setNewProductData] = useState(EMPTY_NEW_PRODUCT);

  const { tg } = useTelegram();
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewFavorited, setPreviewFavorited] = useState(false);

  const handlePreview = (product) => {
    setPreviewData(product);
    setIsPreviewing(true);
  };

  const handleScanBrokenImages = () => {
    showConfirm('ស្កេនរូប Cloudinary 404? រូបបាត់នឹង clear ពី DB — re-upload ក្នុង Admin។', async () => {
      try {
        const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/products/scan-images`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ clearDb: true }),
        });
        if (res.success) {
          const broken = res.data?.broken?.length ?? 0;
          showAlert(broken
            ? `រកឃើញ ${broken} រូបបាត់ — cleared។ Re-upload ក្នុង Products tab។`
            : '✅ រូបទាំងអស់ OK!');
          refetchData(false);
        } else {
          showAlert(res.error || 'Scan failed');
        }
      } catch (err) {
        showAlert('Scan failed: ' + err.message);
      }
    }, '🖼️');
  };

  const submitAddProduct = async () => {
    if (!newProductData.name || !newProductData.price) return showAlert('សូមបំពេញឈ្មោះ និងតម្លៃ!');
    setIsSaving(true);
    try {
      const mergedDescription = buildDescription({
        description: newProductData.description,
        howToUse: newProductData.howToUse,
        ingredients: newProductData.ingredients,
      });
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          ...newProductData,
          description: mergedDescription,
          price: parseFloat(newProductData.price),
          stock: parseInt(newProductData.stock) || 0,
          additional_images: JSON.stringify(newProductData.additional_images || []),
          flash_sale_price: newProductData.flash_sale_price ? parseFloat(newProductData.flash_sale_price) : null,
          flash_sale_end: newProductData.flash_sale_end || null,
          video_url: newProductData.video_url || null
        })
      });
      if (res.success && res.data?.success !== false) {
        setIsAddingProduct(false);
        const newProduct = res.product || res.data?.product || res.data;
        if (newProduct) {
          mutateDashboard(prev => ({
            ...prev,
            products: [newProduct, ...(prev?.products || [])]
          }));
          if (mutateShopData) {
            mutateShopData(prev => ({
              ...prev,
              products: [newProduct, ...(prev?.products || [])]
            }));
          }
        }
        setNewProductData(EMPTY_NEW_PRODUCT);
        refetchData(true);
        refetchShopData(true);
        setToastMessage('បន្ថែមទំនិញបានជោគជ័យ!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      } else {
        showAlert('បរាជ័យក្នុងការបន្ថែម: ' + (res.error || res.data?.error || 'មានបញ្ហាប្រព័ន្ធ'));
      }
    } catch (err) {
      showAlert('បរាជ័យក្នុងការបន្ថែម: ' + (err.message || 'មានបញ្ហាប្រព័ន្ធ'));
    } finally { setIsSaving(false); }
  };

  const submitEditProduct = async () => {
    if (!editingProduct) return;
    setIsSaving(true);
    try {
      const mergedDescription = buildDescription({
        description: editFormData.description,
        howToUse: editFormData.howToUse,
        ingredients: editFormData.ingredients,
      });
      const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          ...editingProduct,
          ...editFormData,
          description: mergedDescription,
          price: parseFloat(editFormData.price),
          stock: parseInt(editFormData.stock),
          additional_images: JSON.stringify(editFormData.additional_images || []),
          flash_sale_price: editFormData.flash_sale_price ? parseFloat(editFormData.flash_sale_price) : null,
          flash_sale_end: editFormData.flash_sale_end || null,
          video_url: editFormData.video_url || null
        })
      });
      if (res.success && res.data?.success !== false) {
        setEditingProduct(null);
        const updatedProduct = res.product || res.data?.product || res.data;
        if (updatedProduct) {
          mutateDashboard(prev => ({
            ...prev,
            products: (prev?.products || []).map(p => p.id === updatedProduct.id ? updatedProduct : p)
          }));
          if (mutateShopData) {
            mutateShopData(prev => ({
              ...prev,
              products: (prev?.products || []).map(p => p.id === updatedProduct.id ? updatedProduct : p)
            }));
          }
        }
        refetchData(true);
        refetchShopData(true);
        setToastMessage('កែប្រែទំនិញជោគជ័យ!');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 2000);
      } else {
        showAlert('បរាជ័យក្នុងការកែប្រែ: ' + (res.error || res.data?.error || 'មានបញ្ហាប្រព័ន្ធ'));
      }
    } catch (err) { showAlert('Error: ' + err.message); }
    finally { setIsSaving(false); }
  };

  const handleDeleteProduct = (productId, productName) => {
    showConfirm(`តើអ្នកពិតជាចង់លុបទំនិញ "${productName}" មែនទេ?`, async () => {
      try {
        const res = await fetchWithRetry(`${BACKEND_URL}/api/admin/products/${productId}`, {
          method: 'DELETE',
          headers
        });
        if (res.success) {
          mutateDashboard(prev => ({
            ...prev,
            products: (prev?.products || []).filter(p => p.id !== productId)
          }));
          if (mutateShopData) {
            mutateShopData(prev => ({
              ...prev,
              products: (prev?.products || []).filter(p => p.id !== productId)
            }));
          }
          refetchData(true);
          refetchShopData(true);
          setToastMessage('លុបទំនិញជោគជ័យ!');
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 2000);
        } else {
          showAlert('បរាជ័យ: ' + (res.error || 'មានបញ្ហាប្រព័ន្ធ'));
        }
      } catch (err) {
        showAlert('បរាជ័យ: ' + err.message);
      }
    }, '🗑️');
  };

  return (
    <>
      <AdminProductsTab
        products={products}
        categories={categories}
        productSearchTerm={productSearchTerm}
        localProductSearchTerm={localProductSearchTerm}
        setLocalProductSearchTerm={setLocalProductSearchTerm}
        setIsAddingProduct={setIsAddingProduct}
        editingProduct={editingProduct}
        setEditingProduct={setEditingProduct}
        setEditFormData={setEditFormData}
        visibleProductLimit={visibleProductLimit}
        setVisibleProductLimit={setVisibleProductLimit}
        handleDeleteProduct={handleDeleteProduct}
        onScanBrokenImages={handleScanBrokenImages}
      >
        {isAddingProduct && (
          <AdminAddProductModal
            isAddingProduct={isAddingProduct}
            isUploading={isUploading}
            newProductData={newProductData}
            setNewProductData={setNewProductData}
            compressImage={compressImage}
            setIsUploading={setIsUploading}
            fetchWithRetry={fetchWithRetry}
            BACKEND_URL={BACKEND_URL}
            headers={headers}
            categories={categories}
            setIsAddingProduct={setIsAddingProduct}
            handlePreview={handlePreview}
            isSaving={isSaving}
            submitAddProduct={submitAddProduct}
          />
        )}

        {editingProduct && (
          <AdminEditProductModal
            editingProduct={editingProduct}
            isUploading={isUploading}
            editFormData={editFormData}
            setEditFormData={setEditFormData}
            compressImage={compressImage}
            setIsUploading={setIsUploading}
            fetchWithRetry={fetchWithRetry}
            BACKEND_URL={BACKEND_URL}
            headers={headers}
            categories={categories}
            setEditingProduct={setEditingProduct}
            handlePreview={handlePreview}
            isSaving={isSaving}
            submitEditProduct={submitEditProduct}
          />
        )}
      </AdminProductsTab>

      {isPreviewing && previewData && (
        <ProductDetail
          product={previewData}
          onClose={() => setIsPreviewing(false)}
          onAdd={() => showAlert('នេះគ្រាន់តែជារូបភាព Preview!')}
          lang={tg?.language_code === 'kh' ? 'kh' : 'en'}
          isFavorited={previewFavorited}
          onToggleWishlist={() => setPreviewFavorited(!previewFavorited)}
        />
      )}
    </>
  );
};

export default AdminProductsContainer;
