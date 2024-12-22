const express = require('express');
const authRoute = require('./auth.route');
const categoryRoute = require('./category.route');
const productRoute = require('./product.route');
const userRoute = require('./user.route');
const docsRoute = require('./docs.route');
const paymentCardRoute = require('./paymentCard.route');
const uploadFileRoute = require('./upload.route');
const orderRoute = require('./order.route');
const favouriteItemRoute = require('./favouriteItem.route');
const contactUsRoute = require('./contactUs.route');
const config = require('../../config/config');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/category',
    route: categoryRoute,
  },
  {
    path: '/products',
    route: productRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/paymentCard',
    route: paymentCardRoute,
  },
  {
    path: '/upload',
    route: uploadFileRoute,
  },
  {
    path: '/orders',
    route: orderRoute,
  },
  {
    path: '/favouriteItem',
    route: favouriteItemRoute,
  },
  {
    path: '/contactUs',
    route: contactUsRoute,
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
