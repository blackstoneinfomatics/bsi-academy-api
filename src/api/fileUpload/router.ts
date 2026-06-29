import { Server, ServerRoute } from "@hapi/hapi";
import handler from "./handler";

const register = async (server: Server): Promise<void> => {
  // Define the routes for this module
  const routes: ServerRoute[] = [
    {
      method: "GET",
      path: "/files/view/{fileId}",
      options: {
        handler:handler.viewFileFromSharePoint ,  
        tags: ["api", "feedback"],  
        description: "View File from SharePoint",},
    },

  ];


  // Register the defined routes with the Hapi server
  server.route(routes);
};

export = {
  name: "api-fileupload",
  register,
};