import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createShippingOptionsWorkflow,
  createRegionsWorkflow,
  createTaxRegionsWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function setupInPostIntegration({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const regionModuleService = container.resolve(Modules.REGION);

  logger.info("Setting up InPost integration...");

  // Check if Poland region exists
  const existingRegions = await regionModuleService.listRegions();
  const polandRegion = existingRegions.find((r) => r.name === "Poland");

  if (!polandRegion) {
    logger.info("Creating Poland region...");
    await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Poland",
            currency_code: "pln",
            countries: ["pl"],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    });
  } else {
    logger.info("Poland region already exists");
  }

  // Create tax region for Poland
  await createTaxRegionsWorkflow(container).run({
    input: [
      {
        country_code: "pl",
        provider_id: "tp_system",
      },
    ],
  });
  logger.info("Created tax region for Poland");

  // Get shipping profile
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });

  if (!shippingProfiles.length) {
    throw new Error(
      "No default shipping profile found. Please run the seed script first."
    );
  }

  const shippingProfile = shippingProfiles[0];

  // Create or get fulfillment set for Poland
  const existingFulfillmentSets =
    await fulfillmentModuleService.listFulfillmentSets({
      name: "Poland InPost Delivery",
    });

  let fulfillmentSet;
  if (existingFulfillmentSets.length > 0) {
    fulfillmentSet = existingFulfillmentSets[0];
    logger.info("Using existing Poland InPost Delivery fulfillment set");
  } else {
    logger.info("Creating Poland InPost Delivery fulfillment set...");
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Poland InPost Delivery",
      type: "shipping",
      service_zones: [
        {
          name: "Poland",
          geo_zones: [
            {
              country_code: "pl",
              type: "country",
            },
          ],
        },
      ],
    });
  }

  // Link InPost fulfillment provider to the fulfillment set
  try {
    await link.create({
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
        fulfillment_provider_id: "inpost-fulfillment_inpost-fulfillment",
      },
    });
    logger.info("Linked InPost provider to fulfillment set");
  } catch (error) {
    logger.info("InPost provider already linked to fulfillment set");
  }

  // Create InPost shipping option
  const existingShippingOptions =
    await fulfillmentModuleService.listShippingOptions({
      name: "Paczkomaty InPost",
    });

  if (existingShippingOptions.length > 0) {
    logger.info("InPost shipping option already exists");
  } else {
    logger.info("Creating InPost shipping option...");
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Paczkomaty InPost",
          price_type: "calculated",
          provider_id: "inpost-fulfillment_inpost-fulfillment",
          service_zone_id: fulfillmentSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Paczkomaty InPost",
            description: "Dostawa do wybranego Paczkomatu InPost",
            code: "inpost_locker_standard",
          },
          rules: [
            {
              attribute: "enabled_in_store",
              value: "true",
              operator: "eq",
            },
            {
              attribute: "is_return",
              value: "false",
              operator: "eq",
            },
          ],
        },
      ],
    });
    logger.info("Created InPost shipping option");
  }

  logger.info("InPost integration setup completed successfully!");
  logger.info("You can now:");
  logger.info("1. Set Polish addresses in checkout");
  logger.info("2. Select 'Paczkomaty InPost' as shipping method");
  logger.info("3. Choose InPost locker using the GeoWidget");
}
