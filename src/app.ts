// src/app.ts

import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import routes from "@/routes";

const router = express.Router();

const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use("/v1", routes);

export default app;
