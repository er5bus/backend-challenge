import { Router } from 'express';
import { WorkflowController } from '../controllers/WorkflowController';
import { AppDataSource } from '../data-source';

const controller: WorkflowController = new WorkflowController(AppDataSource);

const router = Router();

/**
 * GET /workflow/:id/status
 *
 * Returns the current execution status and task progress of a workflow.
 *
 * @response 200 OK
 * {
 *   "workflowId":     "3433c76d-f226-4c91-afb5-7dfc7accab24",
 *   "status":         "in_progress",   // "initial" | "in_progress" | "completed" | "failed"
 *   "completedTasks": 2,
 *   "totalTasks":     3
 * }
 *
 * @response 404 Not Found
 * { "message": "Workflow not found" }
 *
 * @response 500 Internal Server Error
 * { "message": "Internal server error" }
 */
router.get('/:id/status', controller.getStatus);

/**
 * GET /workflow/:id/results
 *
 * Returns the aggregated final result of a workflow
 * Only when workflow has reached "completed" or "failed" status
 *
 * @response 200 OK
 * {
 *   "workflowId":  "3433c76d-f226-4c91-afb5-7dfc7accab24",
 *   "status":      "completed",
 *   "finalResult": {
 *     "tasksCompleted": [],
 *     "tasksFailed":    []
 *   }
 * }
 *
 * @response 400 Bad Request
 * {
 *   "message":    "Workflow is not yet completed",
 *   "workflowId": "3433c76d-f226-4c91-afb5-7dfc7accab24",
 *   "status":     "in_progress"
 * }
 *
 * @response 404 Not Found
 * { "message": "Workflow not found" }
 *
 * @response 500 Internal Server Error
 * { "message": "Internal server error" }
 */
router.get('/:id/results', controller.getResults);

export default router;
