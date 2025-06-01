const { db } = require('../config/firebase');

const saveOfflineOrder = async (order) => {
  const orderRef = db.collection('orders').doc(order.orderId);
  await orderRef.set({
    ...order,
    synced: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return order;
};

const syncOfflineOrders = async (orders) => {
  const batch = db.batch();
  
  orders.forEach((order) => {
    const orderRef = db.collection('orders').doc(order.orderId);
    batch.set(orderRef, {
      ...order,
      synced: true,
      syncedAt: new Date(),
      updatedAt: new Date()
    });
  });

  await batch.commit();
  return orders;
};

const getUnsynedOrders = async () => {
  const snapshot = await db.collection('orders')
    .where('synced', '==', false)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};

module.exports = {
  saveOfflineOrder,
  syncOfflineOrders,
  getUnsynedOrders
};