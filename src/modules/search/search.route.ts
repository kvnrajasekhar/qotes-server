// @ts-nocheck
import { Router, Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { successResponse } from "../../shared/utils/responseFormatter.util";
import searchService from "./search.service";

const router = Router();

router.get(
  "/users",
  asyncHandler(async (req: Request, res: Response) => {
    const query = (req.query.q as string) || "";
    const { cursor, limit } = req.query as { cursor?: any; limit?: number };
    const users = await searchService.searchUsers({ query, cursor, limit });
    return successResponse(
      res,
      200,
      "User search completed successfully",
      users,
    );
  }),
);

router.get(
  "/global",
  asyncHandler(async (req: Request, res: Response) => {
    const query = (req.query.q as string) || "";
    const type = (req.query.type as string) || "all";
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const cursor = req.query.cursor || null;

    const results = await searchService.searchGlobal({
      query,
      type,
      limit,
      cursor,
    });
    return successResponse(
      res,
      200,
      "Global search completed successfully",
      results,
    );
  }),
);

export default router;
