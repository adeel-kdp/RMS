const getTodayDateRange = () => {
  const today = new Date().toISOString().split('T')[0];
  return {
    $gte: new Date(today).setHours(0, 0, 0, 0),
    $lt: new Date(today).setHours(23, 59, 59, 999),
  };
};

module.exports = {
  getTodayDateRange,
};