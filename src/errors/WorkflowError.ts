import { NotFoundError, BadRequestError } from './HttpError';

export class WorkflowNotFoundError extends NotFoundError {
    constructor(workflowId: string) {
        super(`Workflow "${workflowId}" not found`);
        this.name = 'WorkflowNotFoundError';
    }
}

export class WorkflowNotTerminalError extends BadRequestError {
    constructor(workflowId: string) {
        super(`Workflow "${workflowId}" is not yet completed`);
        this.name = 'WorkflowNotTerminalError';
    }
}
