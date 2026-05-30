import { Not, Repository } from 'typeorm';
import { Task } from '../models/Task';
import { Workflow } from '../models/Workflow';
import { Result } from '../models/Result';
import { getJobForTaskType, TaskType } from '../jobs/JobFactory';
import { WorkflowStatus } from '../workflows/WorkflowFactory';

export enum TaskStatus {
    Queued = 'queued',
    InProgress = 'in_progress',
    Completed = 'completed',
    Failed = 'failed'
}

export class TaskRunner {
    constructor(
        private taskRepository: Repository<Task>,
    ) {}

    /**
     * Runs the appropriate job based on the task's type, managing the task's status.
     * @param task - The task entity that determines which job to run.
     * @throws If the job fails, it rethrows the error.
     */
    async run(task: Task): Promise<void> {
        task.status = TaskStatus.InProgress;
        task.progress = 'starting job...';
        await this.taskRepository.save(task);
        const job = getJobForTaskType(task.taskType);

        try {
            console.log(`Starting job ${task.taskType} for task ${task.taskId}...`);
            const resultRepository = this.taskRepository.manager.getRepository(Result);
            const taskResult = await job.run(task);
            console.log(`Job ${task.taskType} for task ${task.taskId} completed successfully.`);
            const result = new Result();
            result.taskId = task.taskId!;
            result.data = JSON.stringify(taskResult || {});
            await resultRepository.save(result);
            task.resultId = result.resultId!;
            task.status = TaskStatus.Completed;
            task.progress = null;
            await this.taskRepository.save(task);

        } catch (error: any) {
            console.error(`Error running job ${task.taskType} for task ${task.taskId}:`, error);

            task.status = TaskStatus.Failed;
            task.progress = null;
            task.errorMessage = error instanceof Error ? error.message : String(error);
            await this.taskRepository.save(task);

            await this.propagateFailureToTheDependentTasks(task);

            await this.updateWorkflowStatus(task.workflow.workflowId);

            throw error;
        }

        await this.updateWorkflowStatus(task.workflow.workflowId);
    }

    private async propagateFailureToTheDependentTasks(failedTask: Task): Promise<void> {
        const dependents = await this.taskRepository.find({
            where: {
                dependencyId: failedTask.taskId,
                status:       TaskStatus.Queued,
                taskType:     Not(TaskType.Report),
            },
            relations: ['workflow'],
        });

        for (const dep of dependents) {
            dep.status       = TaskStatus.Failed;
            dep.progress     = null;
            dep.errorMessage = `Skipped: dependency task ${failedTask.taskId} failed`;
            await this.taskRepository.save(dep);
            await this.propagateFailureToTheDependentTasks(dep);
        }
    }

    private async updateWorkflowStatus(workflowId: string): Promise<void> {
        const workflowRepository = this.taskRepository.manager.getRepository(Workflow);
        const workflow = await workflowRepository.findOne({
            where: { workflowId },
            relations: ['tasks', 'tasks.result'],
        });

        if (!workflow) return;

        const allCompleted = workflow.tasks.every(
            (t) => t.status === TaskStatus.Completed,
        );
        const anyFailed = workflow.tasks.some(
            (t) => t.status === TaskStatus.Failed,
        );

        if (allCompleted) {
            workflow.status      = WorkflowStatus.Completed;
            workflow.finalResult = this.buildFinalResult(workflow);
            console.log(`[TaskRunner] Workflow ${workflowId} completed ✓`);
        } else if (anyFailed) {
            const allTerminal = workflow.tasks.every(
                (t) =>
                    t.status === TaskStatus.Completed ||
                    t.status === TaskStatus.Failed,
            );
            if (allTerminal) {
                workflow.status      = WorkflowStatus.Failed;
                workflow.finalResult = this.buildFinalResult(workflow);
                console.warn(`[TaskRunner] Workflow ${workflowId} failed`);
            } else {
                workflow.status = WorkflowStatus.InProgress;
            }
        } else {
            workflow.status = WorkflowStatus.InProgress;
        }

        await workflowRepository.save(workflow);
    }

    private buildFinalResult(workflow: Workflow): string {
        const tasks = [...workflow.tasks].sort((a, b) => a.stepNumber - b.stepNumber);

        return JSON.stringify({
            tasksCompleted: tasks.filter((t) => t.status === TaskStatus.Completed).map((t) => ({
                taskId:   t.taskId,
                taskType: t.taskType,
                output:   t.result?.data
                    ? (() => {
                          try { return JSON.parse(t.result!.data!); }
                          catch { return t.result!.data; }
                      })()
                    : null,
            })),
            tasksFailed: tasks.filter((t) => t.status === TaskStatus.Failed).map((t) => ({
                taskId:       t.taskId,
                taskType:     t.taskType,
                errorMessage: t.errorMessage,
            })),
        });
    }
}
