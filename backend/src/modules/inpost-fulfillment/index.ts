import { ModuleProviderExports } from "@medusajs/framework/types";
import { InPostFulfillmentService } from "./service";

const services = [InPostFulfillmentService];

const providerExport: ModuleProviderExports = {
  services,
};

export default providerExport;
