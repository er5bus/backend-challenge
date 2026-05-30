import { DataSource } from 'typeorm';
import { Workflow } from '../models/Workflow';
import { Task } from '../models/Task';
import { TaskStatus } from '../workers/taskRunner';
import { WorkflowStatus } from '../workflows/WorkflowFactory';
import { WorkflowNotFoundError, WorkflowNotTerminalError } from '../errors/WorkflowError';

export interface WorkflowStatusResult {
    workflowId: string;
    status: WorkflowStatus;
    completedTasks: number;
    totalTasks: number;
}

export interface WorkflowFinalResult {
    workflowId: string;
    status: WorkflowStatus;
    finalResult: unknown;
}

export class WorkflowService {
    private workflowRepository;
    private taskRepository;

    constructor(dataSource: DataSource) {
        this.workflowRepository = dataSource.getRepository(Workflow);
        this.taskRepository     = dataSource.getRepository(Task);
    }

    async getStatus(workflowId: string): Promise<WorkflowStatusResult> {
        const workflow = await this.workflowRepository.findOne({
            where: { workflowId },
        });

        if (!workflow) {
            throw new WorkflowNotFoundError(workflowId);
        }

        const allTasks = await this.taskRepository.find({
            where: { workflow: { workflowId } },
        });

        const completedTasks = allTasks.filter(
            (t) => t.status === TaskStatus.Completed,
        ).length;

        return {
            workflowId:     workflow.workflowId,
            status:         workflow.status,
            completedTasks,
            totalTasks:     allTasks.length,
        };
    }

    async getResults(workflowId: string): Promise<WorkflowFinalResult> {
        const workflow = await this.workflowRepository.findOne({
            where: { workflowId },
        });

        if (!workflow) {
            throw new WorkflowNotFoundError(workflowId);
        }

        const isTerminal =
            workflow.status === WorkflowStatus.Completed ||
            workflow.status === WorkflowStatus.Failed;

        if (!isTerminal) {
            throw new WorkflowNotTerminalError(workflow.workflowId);
        }

        let parsedResult: unknown = null;
        if (workflow.finalResult) {
            try {
                parsedResult = JSON.parse(workflow.finalResult);
            } catch {
                parsedResult = workflow.finalResult;
            }
        }

        return {
            workflowId:  workflow.workflowId,
            status:      workflow.status,
            finalResult: parsedResult,
        };
    }
}
