import express from "express";
import healthRoute from "../modules/health/health.route";
import customersRoute from "../modules/customer/customers.route";
import laundryRoute from "../modules/laundry/laundry.route";
import ordersRoute from "../modules/order/order.route";
import gupshupHook from "../modules/webhook/gupshup.route";

const router = express.Router();

interface RouteConfig {
  path: string;
  route: express.Router;
  middleware?: express.RequestHandler[];
}

const routes: RouteConfig[] = [
  {
    path: "/health",
    route: healthRoute,
  },

  {
    path: "/customers",
    route: customersRoute,
  },

  {
    path: "/laundry",
    route: laundryRoute,
  },

  {
    path: "/orders",
    route: ordersRoute,
  },

  {
    path: "/webhook/gupshup",
    route: gupshupHook,
  },
];

// Register all routes
routes.forEach(({path, route, middleware = []}) => {
  if (middleware.length > 0) {
    router.use(path, middleware, route);
  } else {
    router.use(path, route);
  }
});

export default router;
