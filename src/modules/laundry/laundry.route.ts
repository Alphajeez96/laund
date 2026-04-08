import {Router} from "express";
import {LaundryController} from "./laundry.controller";

const router = Router();

router.route("/").post(LaundryController.createLaundry);
router
  .route("/:id")
  .get(LaundryController.getLaundry)
  .patch(LaundryController.updateLaundry);

export default router;
