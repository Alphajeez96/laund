import {Router} from "express";

import {CustomerController} from "./customers.controller";

const router = Router();

router.route("/").post(CustomerController.createCustomer).get(CustomerController.listCustomers);
router.route("/:id").get(CustomerController.getCustomer);

export default router;
