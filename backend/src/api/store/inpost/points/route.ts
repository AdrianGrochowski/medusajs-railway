import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { InPostFulfillmentService } from "../../../../modules/inpost-fulfillment/service";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { latitude, longitude, radius, city, name } = req.query;

    // Resolve the InPost fulfillment service
    const inpostService = req.scope.resolve(
      "inpostFulfillmentService"
    ) as InPostFulfillmentService;

    let points = [];

    if (name) {
      // Get specific point by name
      const point = await (inpostService as any).getPointDetails(
        name as string
      );
      points = point ? [point] : [];
    } else if (latitude && longitude) {
      // Get points by coordinates
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      const searchRadius = radius ? parseInt(radius as string) : 5000;

      points = await inpostService.findNearbyPoints(lat, lng, searchRadius);
    } else if (city) {
      // Get points by city
      points = await inpostService.getPointsByCity(city as string);
    }

    res.json({
      points,
      count: points.length,
    });
  } catch (error) {
    console.error("Error fetching InPost points:", error);
    res.status(500).json({
      error: "Failed to fetch InPost points",
      message: error.message,
    });
  }
};
