import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { Workflow } from './Workflow';
import { Result } from './Result';
import { TaskStatus } from '../workers/taskRunner';

@Entity({ name: 'tasks' })
export class Task {
    @PrimaryGeneratedColumn('uuid')
    taskId!: string;

    @Column()
    clientId!: string;

    @Column('text')
    geoJson!: string;

    @Column()
    status!: TaskStatus;

    @Column({ nullable: true, type: 'text' })
    progress?: string | null;

    @Column({ nullable: true })
    resultId?: string;

    @Column()
    taskType!: string;

    @Column({ default: 1 })
    stepNumber!: number;

    @ManyToOne(() => Workflow, workflow => workflow.tasks)
    workflow!: Workflow;

    @OneToOne(() => Result, { nullable: true, eager: false })
    @JoinColumn({ name: 'resultId' })
    result?: Result | null;

    @Column({ nullable: true, type: 'text' })
    errorMessage?: string | null;

    @Column({ nullable: true, type: 'text' })
    dependencyId?: string | null;

    @ManyToOne(() => Task, { nullable: true, eager: false })
    @JoinColumn({ name: 'dependencyId' })
    dependency?: Task | null;
}
