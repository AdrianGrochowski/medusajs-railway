import {
  AbstractFulfillmentProviderService,
  MedusaError,
} from "@medusajs/framework/utils";
import { Logger } from "@medusajs/framework/types";
import {
  FulfillmentTypes,
  FulfillmentItemDTO,
  FulfillmentOrderDTO,
  FulfillmentDTO,
  CalculatedShippingOptionPrice,
  StockLocationDTO,
  CreateShippingOptionDTO,
  CreateFulfillmentResult,
} from "@medusajs/framework/types";
import axios, { AxiosInstance } from "axios";

type InjectedDependencies = {
  logger: Logger;
};

interface InPostServiceConfig {
  apiToken: string;
  organizationId: string;
  webhookUrl?: string;
  apiUrl?: string;
}

export interface InPostFulfillmentOptions {
  api_token: string;
  organization_id: string;
  webhook_url?: string;
  api_url?: string;
}

// InPost API Types
interface InPostAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  zip_code: string;
  country: string;
}

interface InPostDimensions {
  length: number;
  width: number;
  height: number;
  unit: "cm" | "in";
}

interface InPostWeight {
  value: number;
  unit: "kg" | "g" | "lb" | "oz";
}

interface InPostReceiver {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
}

interface InPostParcel {
  template?: string;
  dimensions?: InPostDimensions;
  weight?: InPostWeight;
  reference?: string;
  is_non_standard?: boolean;
}

interface InPostShipmentRequest {
  receiver: InPostReceiver;
  parcels: InPostParcel[];
  service: string;
  reference?: string;
  target_point?: string;
  custom_attributes?: Record<string, string>;
}

interface InPostShipment {
  id: string;
  created_at: string;
  tracking_number: string;
  status: string;
  service: string;
  target_point?: string;
  receiver: InPostReceiver;
  parcels: InPostParcel[];
  label_url?: string;
  tracking_url?: string;
}

interface InPostPoint {
  name: string;
  address: InPostAddress;
  location: {
    latitude: number;
    longitude: number;
  };
  location_type: string;
  type: string[];
  status: string;
  opening_hours?: string;
  payment_available?: boolean;
  payment_type?: string[];
}

type CartPropsForFulfillment = {
  shipping_address?: {
    country_code?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    city?: string;
    postal_code?: string;
    address_1?: string;
    address_2?: string;
  };
  items?: Array<{
    variant?: {
      weight?: number;
    };
    quantity: number;
  }>;
  email?: string;
};

type FulfillmentContext = {
  cart?: CartPropsForFulfillment;
  shipping_address?: {
    country_code?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    city?: string;
    postal_code?: string;
  };
  from_location?: StockLocationDTO;
};

/**
 * InPost Fulfillment Service for Medusa 2.0
 * Handles fulfillment operations using InPost ShipX API for locker deliveries
 */
export class InPostFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = "inpost-fulfillment";

  protected config_: InPostServiceConfig;
  protected logger_: Logger;
  protected client_: AxiosInstance;

  constructor(
    { logger }: InjectedDependencies,
    options: InPostFulfillmentOptions
  ) {
    super();

    this.config_ = {
      apiToken: options.api_token,
      organizationId: options.organization_id,
      webhookUrl: options.webhook_url,
      apiUrl: options.api_url || "https://api-shipx-pl.easypack24.net/v1",
    };

    this.logger_ = logger;

    // Initialize axios client
    this.client_ = axios.create({
      baseURL: this.config_.apiUrl,
      headers: {
        Authorization: `Bearer ${this.config_.apiToken}`,
        "Content-Type": "application/json",
      },
    });

    this.logger_.info("InPost Fulfillment Service initialized");
  }

  static validateOptions(options: Record<string, any>): void {
    if (!options.api_token) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "api_token is required in InPost fulfillment options"
      );
    }

    if (!options.organization_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "organization_id is required in InPost fulfillment options"
      );
    }
  }

  async getFulfillmentOptions(): Promise<FulfillmentTypes.FulfillmentOption[]> {
    return [
      {
        id: "inpost_locker_standard",
        name: "Paczkomaty InPost",
        type: "inpost_locker_standard",
        description: "Dostawa do wybranego Paczkomatu InPost",
      },
    ];
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: FulfillmentContext
  ): Promise<any> {
    const { target_point } = data;

    if (!target_point) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "target_point is required for InPost locker delivery"
      );
    }

    // Validate that the target point exists and is active
    try {
      const point = await this.getPointDetails(target_point as string);

      if (!point || point.status !== "Operating") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Selected InPost locker is not available"
        );
      }

      return {
        target_point,
        point_name: point.name,
        point_address: point.address,
      };
    } catch (error) {
      this.logger_.error("Error validating InPost point:", error);
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Failed to validate InPost locker"
      );
    }
  }

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    // InPost is available only for Poland
    const shippingAddress = (data as any).shipping_address;

    if (!shippingAddress) {
      return false;
    }

    // Check if shipping address is in Poland
    const countryCode = shippingAddress.country_code?.toLowerCase();
    return countryCode === "pl";
  }

  async canCalculate(data: CreateShippingOptionDTO): Promise<boolean> {
    // Check if the shipping address is in Poland
    return (
      data.name === "inpost_locker_standard" ||
      data.provider_id === "inpost-fulfillment"
    );
  }

  async calculatePrice(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: FulfillmentContext
  ): Promise<CalculatedShippingOptionPrice> {
    // InPost pricing logic - could be based on weight, dimensions, etc.
    // For now, using a flat rate
    const basePrice = 1290; // 12.90 PLN in cents

    const cart = context.cart;
    if (!cart?.items?.length) {
      return {
        calculated_amount: basePrice,
        is_calculated_price_tax_inclusive: false,
      };
    }

    // Calculate price based on total weight or item count
    let totalWeight = 0;
    for (const item of cart.items) {
      const weight = item.variant?.weight || 0;
      totalWeight += weight * item.quantity;
    }

    // Add extra cost for heavy packages
    const finalPrice = totalWeight > 5000 ? basePrice + 500 : basePrice; // +5 PLN for heavy packages

    return {
      calculated_amount: finalPrice,
      is_calculated_price_tax_inclusive: false,
    };
  }

  async createFulfillment(
    data: Record<string, unknown>,
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[],
    order: Partial<FulfillmentOrderDTO>,
    fulfillment: Partial<FulfillmentDTO>
  ): Promise<CreateFulfillmentResult> {
    if (!order.shipping_address) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Order must have a shipping address"
      );
    }

    const targetPoint = data.target_point as string;

    if (!targetPoint) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "target_point is required for InPost fulfillment"
      );
    }

    try {
      // Prepare shipment data
      const shipmentData: InPostShipmentRequest = {
        receiver: {
          first_name: order.shipping_address.first_name || "",
          last_name: order.shipping_address.last_name || "",
          phone: order.shipping_address.phone || "",
          email: order.email || "",
        },
        parcels: this.prepareParcelData(items),
        service: "inpost_locker_standard",
        target_point: targetPoint,
        reference: `ORDER-${order.display_id}`,
        custom_attributes: {
          order_id: order.id || "",
          medusa_fulfillment: "true",
        },
      };

      // Create shipment via InPost API
      const response = await this.client_.post("/shipments", shipmentData);
      const shipment: InPostShipment = response.data;

      this.logger_.info(`Created InPost shipment: ${shipment.id}`);

      return {
        data: {
          inpost_shipment_id: shipment.id,
          tracking_number: shipment.tracking_number,
          tracking_url: shipment.tracking_url,
          target_point: targetPoint,
          service: "inpost_locker_standard",
          label_url: shipment.label_url,
        },
        labels: shipment.label_url
          ? [
              {
                tracking_number: shipment.tracking_number,
                tracking_url: shipment.tracking_url || "",
                label_url: shipment.label_url,
              },
            ]
          : [],
      };
    } catch (error) {
      this.logger_.error("Error creating InPost shipment:", error);
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Failed to create InPost shipment"
      );
    }
  }

  async cancelFulfillment(
    fulfillment: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const shipmentId = fulfillment.inpost_shipment_id;

    if (!shipmentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "InPost shipment ID not found"
      );
    }

    try {
      // Cancel shipment via InPost API
      await this.client_.delete(`/shipments/${shipmentId}`);

      this.logger_.info(`Cancelled InPost shipment: ${shipmentId}`);

      return {
        ...fulfillment,
        cancelled_at: new Date().toISOString(),
      };
    } catch (error) {
      this.logger_.error("Error cancelling InPost shipment:", error);
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Failed to cancel InPost shipment"
      );
    }
  }

  async createReturn(
    returnData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // InPost doesn't typically handle returns through the same API
    // This would need to be implemented based on your return policy
    this.logger_.warn("InPost return creation not implemented");
    return {};
  }

  async getShipmentDocuments(data: Record<string, unknown>): Promise<never[]> {
    // Return empty array as per interface requirement
    return [];
  }

  async retrieveDocuments(
    fulfillmentData: Record<string, unknown>,
    documentType: "invoice" | "label"
  ): Promise<any> {
    const shipmentId = fulfillmentData.inpost_shipment_id;

    if (!shipmentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "InPost shipment ID not found"
      );
    }

    try {
      if (documentType === "label") {
        const response = await this.client_.get(
          `/shipments/${shipmentId}/label`
        );
        return response.data;
      }

      // InPost doesn't provide invoices through API
      return null;
    } catch (error) {
      this.logger_.error(`Error getting InPost ${documentType}:`, error);
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Failed to get InPost ${documentType}`
      );
    }
  }

  // Helper methods
  private prepareParcelData(
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[]
  ): InPostParcel[] {
    // For now, using a standard parcel template
    // In production, you'd calculate based on actual item dimensions
    return [
      {
        template: "small", // InPost parcel template
        weight: {
          value: this.calculateTotalWeight(items),
          unit: "kg",
        },
        reference: `ITEMS-${items.length}`,
      },
    ];
  }

  private calculateTotalWeight(
    items: Partial<Omit<FulfillmentItemDTO, "fulfillment">>[]
  ): number {
    let totalWeight = 0;
    for (const item of items) {
      const weight = (item as any).variant?.weight || 500; // Default 500g per item
      totalWeight += weight * (item.quantity || 1);
    }
    return Math.max(totalWeight / 1000, 0.1); // Convert to kg, minimum 0.1kg
  }

  private async getPointDetails(
    pointName: string
  ): Promise<InPostPoint | null> {
    try {
      const response = await this.client_.get(`/points/${pointName}`);
      return response.data;
    } catch (error) {
      this.logger_.error("Error getting point details:", error);
      return null;
    }
  }

  // Public API methods for frontend integration
  async findNearbyPoints(
    latitude: number,
    longitude: number,
    radius: number = 5000
  ): Promise<InPostPoint[]> {
    try {
      const response = await this.client_.get("/points", {
        params: {
          latitude,
          longitude,
          radius,
          type: "parcel_locker",
          status: "Operating",
        },
      });
      return response.data;
    } catch (error) {
      this.logger_.error("Error finding nearby points:", error);
      return [];
    }
  }

  async getPointsByCity(city: string): Promise<InPostPoint[]> {
    try {
      const response = await this.client_.get("/points", {
        params: {
          city,
          type: "parcel_locker",
          status: "Operating",
        },
      });
      return response.data;
    } catch (error) {
      this.logger_.error("Error getting points by city:", error);
      return [];
    }
  }

  async getTrackingInfo(trackingNumber: string): Promise<any> {
    try {
      const response = await this.client_.get(
        `/shipments/tracking/${trackingNumber}`
      );
      return response.data;
    } catch (error) {
      this.logger_.error("Error getting tracking info:", error);
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Tracking information not found"
      );
    }
  }
}

export default InPostFulfillmentService;
