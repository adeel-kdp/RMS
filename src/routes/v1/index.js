const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const productRoute = require('./product.route');
const categoryRoute = require('./category.route');
const shopRoute = require('./shop.route');
const regularStockRoute = require('./regularStock.route');
const uploadRoute = require('./upload.route');
const contactUsRoute = require('./contactUs.route');
const orderRoute = require('./order.route');
const favouriteItemRoute = require('./favouriteItem.route');
const expenseRoute = require('./expense.route'); // Add this line
const docsRoute = require('./docs.route');
const config = require('../../config/config');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/products',
    route: productRoute,
  },
  {
    path: '/category',
    route: categoryRoute,
  },
  {
    path: '/shop',
    route: shopRoute,
  },
  {
    path: '/regularStock',
    route: regularStockRoute,
  },
  {
    path: '/upload',
    route: uploadRoute,
  },
  {
    path: '/contactUs',
    route: contactUsRoute,
  },
  {
    path: '/orders',
    route: orderRoute,
  },
  {
    path: '/expenses', // Add this line
    route: expenseRoute, // Add this line
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;
