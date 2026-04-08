import {Router} from "express";

import {OrderController} from "./order.controller";

const router = Router();

router.route("/").post(OrderController.createOrder).get(OrderController.listOrders);
router
  .route("/:id")
  .get(OrderController.getOrder)
  .patch(OrderController.updateOrder);

export default router;
