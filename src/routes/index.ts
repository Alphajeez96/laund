import express from "express";
import healthRoute from "@/modules/health/health.route";
import customersRoute from "@/modules/customer/customers.routes";

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
