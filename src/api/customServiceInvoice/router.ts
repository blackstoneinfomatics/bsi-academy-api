import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";
import { customServiceInvoiceMessages } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/custom-service-invoices",
      options: {
        handler: handler.createCustomServiceInvoice,
        description: customServiceInvoiceMessages.CREATE,
        tags: ["api", "custom-service-invoice"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },
    {
      method: "GET",
      path: "/custom-service-invoices/{invoiceId}",
      options: {
        handler: handler.getCustomServiceInvoiceById,
        description: customServiceInvoiceMessages.GET_BY_ID,
        tags: ["api", "custom-service-invoice"],
        // auth: {
        //   strategies: ["jwt"],
        // },
      },
    },
  ];
  server.route(routes);
};

export = {
  name: "api-customserviceinvoice",
  register,
};
