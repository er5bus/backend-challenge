import { Brackets } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Task } from '../models/Task';
import { TaskRunner, TaskStatus } from './taskRunner';
import { TaskType } from '../jobs/JobFactory';

export async function taskWorker() {
    const taskRepository = AppDataSource.getRepository(Task);
    const taskRunner = new TaskRunner(taskRepository);

    while (true) {
        const task = await taskRepository
            .createQueryBuilder('task')
            .leftJoinAndSelect('task.workflow',    'workflow')
            .leftJoinAndSelect('task.dependency',  'dependency')
            .where('task.status = :status', { status: TaskStatus.Queued })
            .andWhere(new Brackets(qbDependency => qbDependency
                .where('task.dependencyId IS NULL')
                .orWhere('dependency.status = :completed', { completed: TaskStatus.Completed })
                .orWhere(new Brackets(qbReport => qbReport
                    .where('task.taskType = :report', { report: TaskType.Report })
                    .andWhere('dependency.status = :failed', { failed: TaskStatus.Failed }),
                )),
            ))
            .orderBy('task.stepNumber', 'ASC')
            .getOne();

        if (task) {
            try {
                await taskRunner.run(task);

            } catch (error) {
                console.error('Task execution failed. Task status has already been updated by TaskRunner.');
                console.error(error);
            }
        }

        // Wait before checking for the next task again
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}