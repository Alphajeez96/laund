import {Router} from "express";
import {PostController} from "./customers.controller";

const router = Router();

router.route("/").post(PostController.createCustomer);

export default router;
