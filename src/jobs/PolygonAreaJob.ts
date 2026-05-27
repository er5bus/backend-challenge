import { Job } from './Job';
import { Task } from '../models/Task';
import { area } from '@turf/turf';
import { Feature, Polygon } from 'geojson';


export class PolygonAreaJob implements Job {

    parseGeoJson(geoJson: string): Feature<Polygon> {
        try {
            const geometry: Feature<Polygon> = JSON.parse(geoJson);

            if (geometry.type !== 'Feature' || !geometry.geometry) {
                throw new Error('Invalid GeoJSON: Expected a Feature with geometry');
            }

            if (geometry.geometry.type !== 'Polygon') {
                throw new Error(
                    `Invalid geometry type: Expected 'Polygon', got '${geometry.geometry.type}'`
                );
            }

            return geometry;
        } catch (error: any) {
            const errorMessage = `Failed to parse GeoJSON: ${error.message}`;
            console.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    calculateArea(geometry: Feature<Polygon>): number {
        try {
            return area(geometry);
        } catch (error: any) {
            const errorMessage = `Failed to calculate area: ${error.message}`;
            console.error(errorMessage);
            throw new Error(errorMessage);
        }
    }

    async run(task: Task): Promise<{ areaSquareMeters: number }> {
        console.log(`Calculating polygon area for task ${task.taskId}...`);

        const geometry: Feature<Polygon> = this.parseGeoJson(task.geoJson);
        const areaSquareMeters = this.calculateArea(geometry);

        console.log(`Successfully calculated polygon area: ${areaSquareMeters} square meters for task ${task.taskId}`);

        return {areaSquareMeters};
    }
}
