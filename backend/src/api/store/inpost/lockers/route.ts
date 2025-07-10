import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { INPOST_API_KEY } from "../../../../lib/constants";

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const requestId = Math.random().toString(36).substring(7);

  try {
    console.log(`[InPost-${requestId}] Fetching lockers request started`);

    const {
      latitude,
      longitude,
      city,
      postcode,
      country_code = "PL",
      radius = 5000,
      limit = 20,
    } = req.query;

    console.log(`[InPost-${requestId}] Request parameters:`, {
      latitude,
      longitude,
      city,
      postcode,
      country_code,
      radius,
      limit,
    });

    if (!INPOST_API_KEY) {
      console.error(`[InPost-${requestId}] InPost API key not configured`);
      res.status(400).json({
        error: "InPost API not configured",
        requestId,
      });
      return;
    }

    const queryParams = new URLSearchParams();

    if (latitude && longitude) {
      queryParams.append("latitude", latitude as string);
      queryParams.append("longitude", longitude as string);
      console.log(
        `[InPost-${requestId}] Using GPS coordinates: ${latitude}, ${longitude}`
      );
    }

    if (city) {
      queryParams.append("city", city as string);
      console.log(`[InPost-${requestId}] Searching by city: ${city}`);
    }

    if (postcode) {
      queryParams.append("postcode", postcode as string);
      console.log(`[InPost-${requestId}] Searching by postcode: ${postcode}`);
    }

    if (country_code) {
      queryParams.append("country_code", country_code as string);
      console.log(`[InPost-${requestId}] Country code: ${country_code}`);
    }

    if (radius) queryParams.append("radius", radius.toString());
    if (limit) queryParams.append("limit", limit.toString());

    // Add function filter for parcel lockers
    queryParams.append("functions", "parcel_locker");
    queryParams.append("type", "parcel_locker");

    const apiUrl = "https://api-shipx-pl.easypack24.net";
    const fullUrl = `${apiUrl}/v1/points?${queryParams}`;

    console.log(`[InPost-${requestId}] Calling InPost API: ${fullUrl}`);

    const response = await fetch(fullUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${INPOST_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    console.log(
      `[InPost-${requestId}] InPost API response status: ${response.status}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[InPost-${requestId}] InPost API error:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });

      res.status(response.status).json({
        error: `InPost API error: ${response.status} ${response.statusText}`,
        details: errorText,
        requestId,
      });
      return;
    }

    const data = await response.json();
    console.log(`[InPost-${requestId}] Raw InPost response:`, {
      totalItems: data.items?.length || 0,
      hasItems: !!data.items,
      sampleItem: data.items?.[0]
        ? {
            name: data.items[0].name,
            city: data.items[0].address?.city,
            status: data.items[0].status,
          }
        : null,
    });

    // Transform the data to a more frontend-friendly format
    const lockers = (data.items || []).map((locker: any) => {
      const transformed = {
        id: locker.name,
        name: locker.name,
        description: locker.location_description,
        address: {
          line1: locker.address?.line1 || "",
          line2: locker.address?.line2 || "",
          city: locker.address?.city || "",
          postcode: locker.address?.post_code || "",
          country: locker.address?.country_code || "",
        },
        location: {
          latitude: locker.location?.latitude || 0,
          longitude: locker.location?.longitude || 0,
        },
        opening_hours: locker.opening_hours || "24/7",
        payment_available: locker.payment_available || false,
        is_next: locker.is_next || false,
        recommended: locker.recommended || false,
        image_url: locker.image_url || "",
        status: locker.status || "Operating",
      };

      // Log any data transformation issues
      if (!locker.name) {
        console.warn(`[InPost-${requestId}] Locker missing name:`, locker);
      }
      if (!locker.address?.city) {
        console.warn(`[InPost-${requestId}] Locker missing city:`, locker.name);
      }

      return transformed;
    });

    console.log(
      `[InPost-${requestId}] Successfully transformed ${lockers.length} lockers`
    );

    const result = {
      lockers,
      total: lockers.length,
      requestId,
    };

    res.json(result);
  } catch (error: any) {
    console.error(`[InPost-${requestId}] Error fetching InPost lockers:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    res.status(500).json({
      error: "Failed to fetch InPost lockers",
      details: error.message,
      requestId,
    });
  }
}
