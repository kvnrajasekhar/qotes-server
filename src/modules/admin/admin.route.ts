// @ts-nocheck
import express, { Request, Response } from "express";
import {
  successResponse,
  errorResponse,
} from "../../shared/utils/responseFormatter.util";
import adminService from "./admin.service";

const router = express.Router();

router.get("/allusers", async (req: Request, res: Response) => {
  try {
    const { cursor, limit } = req.query as { cursor?: unknown; limit?: number };
    const users = await adminService.getAllUsers({ cursor, limit });
    return successResponse(res, 200, "Fetched all users successfully", users);
  } catch (error: any) {
    return errorResponse(res, 500, "Failed to fetch users", error?.message);
  }
});

router.get("/hiddenquotes", async (req: Request, res: Response) => {
  try {
    const { cursor, limit } = req.query as { cursor?: unknown; limit?: number };
    const quotes = await adminService.getHiddenQuotes({ cursor, limit });
    return successResponse(
      res,
      200,
      "Fetched hidden quotes successfully",
      quotes,
    );
  } catch (error: any) {
    return errorResponse(
      res,
      500,
      "Failed to fetch hidden quotes",
      error?.message,
    );
  }
});

export default router;
