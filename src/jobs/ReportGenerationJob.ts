import { Repository } from 'typeorm';
import { Job } from './Job';
import { Task } from '../models/Task';
import { TaskStatus } from '../workers/taskRunner';
import { AppDataSource } from '../data-source';

interface TaskReport {
    taskId: string;
    taskType: string;
    output: unknown;
    error?: string;
}

interface TaskReportSummary {
    taskReports: TaskReport[];
    completedCount: number;
    failedCount: number;
}

interface Report {
    workflowId: string;
    tasks: TaskReport[];
    finalReport: string;
}

export class ReportGenerationJob implements Job {
    private taskRepository : Repository<Task>;
    constructor() {
        this.taskRepository = AppDataSource.getRepository(Task);
    }

    private async getAllTasks(taskId: string, workflowId: string): Promise<Task[]> {
        const allTasks: Task[] = await this.taskRepository.find({
            where: [
                { workflow: { workflowId }, status: TaskStatus.Completed },
                { workflow: { workflowId }, status: TaskStatus.Failed },
            ],
            relations: ['workflow', 'result'],
            order: { stepNumber: 'ASC' },
        });

        return allTasks.filter((t) => t.taskId !== taskId);
    }

    private async generateTaskReport(tasks: Task[]): Promise<TaskReportSummary> {

        const taskReports: TaskReport[] = tasks.map((t: Task) => {
            const entry: TaskReport = {
                taskId: t.taskId,
                taskType: t.taskType,
                output: null,
            };

            if (t.status === TaskStatus.Completed && t.result?.data) {
                try {
                    entry.output = JSON.parse(t.result.data);
                } catch {
                    entry.output = t.result.data;
                }
            } else if (t.status === TaskStatus.Failed) {
                entry.error = t.errorMessage || 'Unknown error';
            }

            return entry;
        });

        const completedCount = tasks.filter(
            (t: Task) => t.status === TaskStatus.Completed
        ).length;
        const failedCount = tasks.filter(
            (t: Task) => t.status === TaskStatus.Failed
        ).length;

        return { taskReports, completedCount, failedCount };

    }

    async run(task: Task): Promise<Report> {
        console.log(`[ReportGenerationJob] Generating report for workflow ${task.workflow.workflowId}…`);

        const precedingTasks: Task[] = await this.getAllTasks(task.taskId, task.workflow.workflowId);

        const taskReportSummary: TaskReportSummary = await this.generateTaskReport(precedingTasks);

        const report: Report = {
            workflowId: task.workflow.workflowId,
            tasks: taskReportSummary.taskReports,
            finalReport:
                `Workflow ${task.workflow.workflowId} summary: ` +
                `${taskReportSummary.completedCount} task(s) completed, ${taskReportSummary.failedCount} task(s) failed ` +
                `out of ${taskReportSummary.taskReports.length} total preceding task(s).`,
        };

        console.log(`[ReportGenerationJob] Report ready for workflow ${task.workflow.workflowId}`);

        return report;
    }
}
