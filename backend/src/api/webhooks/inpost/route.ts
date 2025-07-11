import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";
import { IFulfillmentModuleService } from "@medusajs/framework/types";

interface InPostWebhookData {
  shipment_id: string;
  status: string;
  tracking_number?: string;
  [key: string]: any;
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const webhookData = req.body as InPostWebhookData;

    // Verify webhook authenticity here if needed
    // InPost doesn't provide webhook signatures, so you might want to
    // implement your own verification mechanism

    const { shipment_id, status, tracking_number } = webhookData;

    if (!shipment_id || !status) {
      return res.status(400).json({ error: "Missing required webhook data" });
    }

    // Resolve the fulfillment service
    const fulfillmentService: IFulfillmentModuleService = req.scope.resolve(
      Modules.FULFILLMENT
    );

    // Find the fulfillment by InPost shipment ID
    // This is a simplified approach - in production you might need to store
    // the mapping between InPost shipment ID and Medusa fulfillment ID
    const fulfillments = await fulfillmentService.listFulfillments({});

    const fulfillment = fulfillments.find(
      (f) => f.metadata?.inpost_shipment_id === shipment_id
    );

    if (!fulfillment) {
      console.log(
        `No fulfillment found for InPost shipment ID: ${shipment_id}`
      );
      return res.status(404).json({ error: "Fulfillment not found" });
    }

    // Log the status update
    console.log(
      `InPost webhook received: ${status} for shipment ${shipment_id}`
    );

    // Update fulfillment metadata with the new status
    const updatedMetadata: Record<string, any> = {
      ...fulfillment.metadata,
      inpost_status: status,
      last_webhook_update: new Date().toISOString(),
    };

    if (tracking_number) {
      updatedMetadata.tracking_number = tracking_number;
    }

    await fulfillmentService.updateFulfillment(fulfillment.id, {
      metadata: updatedMetadata,
    });

    console.log(
      `Updated fulfillment ${fulfillment.id} with InPost status: ${status}`
    );

    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Error processing InPost webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
