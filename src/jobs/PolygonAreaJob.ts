import { Job } from "./Job";
import { Task } from "../models/Task";
import { area } from "@turf/turf";
import { Feature, Polygon } from "geojson";

export class PolygonAreaJob implements Job {
  private parseGeoJson(raw: string): Polygon | Feature<Polygon> {
    try {
      const parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== "object") {
        throw new Error("Root payload must be an object");
      }

      if (parsed?.type === "Polygon") {
        return parsed as Polygon;
      }

      if (parsed?.type === "Feature") {
        return parsed as Feature<Polygon>;
      }
      throw new Error(
        `Expected type 'Polygon' or 'Feature', got '${parsed?.type}'`
      );
    } catch (error: any) {
      throw new Error(
        `Invalid GeoJSON: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  async run(task: Task): Promise<number> {
    console.log(`Calculating polygon area for task ${task.taskId}…`);

    const geometry: Polygon | Feature<Polygon> = this.parseGeoJson(
      task.geoJson
    );
    const areaSquareMeters: number = area(geometry);
    console.log(
      `[PolygonAreaJob] Area for task ${
        task.taskId
      }: ${areaSquareMeters.toFixed(2)} m²`
    );
    return areaSquareMeters;
  }
}
