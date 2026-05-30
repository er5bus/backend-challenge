import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { WorkflowService } from '../services/WorkflowService';

export class WorkflowController {
    private service: WorkflowService;

    constructor(dataSource: DataSource) {
        this.service = new WorkflowService(dataSource);
    }

    getStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const result = await this.service.getStatus(req.params.id).catch(next);
        if (result) res.status(200).json(result);
    };

    getResults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const result = await this.service.getResults(req.params.id).catch(next);
        if (result) res.status(200).json(result);
    };
}
