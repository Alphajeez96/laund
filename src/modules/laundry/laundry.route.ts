import {Router} from "express";
import {LaundryController} from "./laundry.controller";

const router = Router();

router.route("/").post(LaundryController.createLaundry);

export default router;
