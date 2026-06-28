import { Response } from "express";

interface SuccessResponseData {
  success: boolean;
  statusCode: number;
  message: string;
  data: any;
}

interface ErrorResponseData {
  success: boolean;
  statusCode: number;
  message: string;
  errors: any;
}

/**
 * Standardizes successful API response formatting.
 * @param {object} res - The Express response object.
 * @param {number} statusCode - The HTTP status code (e.g., 200, 201).
 * @param {string} message - A brief description of the outcome.
 * @param {object | array} data - The primary data payload.
 */
const successResponse = (
  res: Response,
  statusCode: number,
  message: string,
  data: any = {},
): Response => {
  return res.status(statusCode).json({
    success: true,
    statusCode: statusCode,
    message: message,
    data: data,
  });
};

/**
 * Standardizes error API response formatting.
 * @param {object} res - The Express response object.
 * @param {number} statusCode - The HTTP status code (e.g., 400, 401, 500).
 * @param {string} message - A brief description of the error.
 * @param {object | array} errors - Details of the error (e.g., validation errors).
 */
const errorResponse = (
  res: Response,
  statusCode: number,
  message: string,
  errors: any = [],
): Response => {
  return res.status(statusCode).json({
    success: false,
    statusCode: statusCode,
    message: message,
    errors: errors,
  });
};

export { successResponse, errorResponse };
