
import { Server, ServerRoute } from "@hapi/hapi";
import { createPaymentIntent, createStudentPaymentIntent } from "./handler";  // Import the function correctly

const register = async (server: Server): Promise<void> => {
  // Define the routes for this module
  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/create-payment-intent",
      options: {
        handler: createPaymentIntent,  
        tags: ["api", "payment"],  
        },
    },
    {
      method: "POST",
      path: "/student/create-payment-intent",
      options: {
        handler: createStudentPaymentIntent,  
        tags: ["api", "payment"],  
        },
    },
  ];

  // Register the defined routes with the Hapi server
  server.route(routes);
};

export = {
  name: "api-payment",
  register,
};

