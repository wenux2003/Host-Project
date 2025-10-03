import express from 'express';
const router = express.Router();
import {
    createPayment,
    getPayments,
    getPayment,
    updatePaymentStatus,
    updatePayment,
    deletePayment,
    getPaymentsByUser,
    getPaymentsByOrder,
    processOrderPayment,
    processRefund,
    getPaymentStats,
    paySelectedCartItems
} from '../controllers/paymentController.js';
import { protect, authorizeRoles } from '../utils/protect.js';

// --- Admin & Manager Only Routes ---
router.get('/', protect, authorizeRoles('admin', 'order_manager'), getPayments);
router.get('/stats', protect, authorizeRoles('admin', 'order_manager'), getPaymentStats);
router.post('/process-order', protect, authorizeRoles('admin', 'order_manager'), processOrderPayment);
router.post('/:paymentId/refund', protect, authorizeRoles('admin', 'order_manager'), processRefund);

router.get('/:id', protect, authorizeRoles('admin', 'order_manager'), getPayment);
router.put('/:id/status', protect, authorizeRoles('admin', 'order_manager'), updatePaymentStatus);
router.put('/:id', protect, authorizeRoles('admin', 'order_manager'), updatePayment);
router.delete('/:id', protect, authorizeRoles('admin', 'order_manager'), deletePayment);

// --- Routes for specific users or orders (could be used by customers too) ---
router.get('/user/:userId', protect, getPaymentsByUser);
router.get('/order/:orderId', protect, getPaymentsByOrder);

// --- Public or Customer Route to create a payment ---
router.post('/', protect, createPayment); // Assuming any logged-in user can create a payment

// Customer route: pay for selected cart items and remove from cart
router.post('/pay-selected', protect, paySelectedCartItems);

export default router;
