import {Router} from "express";
import {GupshupHookController} from "./gupshup.controller";

const router = Router();

router.route("/").post(GupshupHookController.handle);

export default router;
