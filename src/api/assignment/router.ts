import { Server, ServerRoute } from "@hapi/hapi";
import Inert from "@hapi/inert";
import handler from "./handler";
import { assignemntMessages } from "../../config/messages";

const register = async (server: Server): Promise<void> => {
  await server.register(Inert);

  const routes: ServerRoute[] = [
    {
      method: "POST",
      path: "/assignments",
      options: {
        handler: handler.createAssignment,
        description: "Create an assignment",
        tags: ["api", "student"],
        payload: {
          output: "stream",
          parse: true,
          maxBytes: 50 * 1024 * 1024,
          multipart: true,
          allow: "multipart/form-data",
        },
        auth: {
          strategies: ["jwt"],
        },
       },
    },
//     {
//       method: "GET",
//       path: "/allAssignment",
//       options: {
//         handler: handler.getAllAssignment,
//         description: "Get all assignments",
//         tags: ["api", "assignment"],
//         auth: {
//           strategies: ["jwt"],
//         },  },
//     },

//janani
   {
  method: "GET",
  path: "/assignments",
  options: {
    handler: handler.getAssignmentsByStudentId,
    description: "Get all assignments for a student by studentId",
    tags: ["api", "assignment"],
    
    auth: {
      strategies: ["jwt"],
    },
  },
   },

  //jo
   {
  method: "GET",
  path: "/assignments/student",
  options: {
    handler: handler.getByStudentId,
    description: "Get all assignments for a student by studentId",
    tags: ["api", "assignment"],
    
    auth: {
      strategies: ["jwt"],
    },
  },
   },

//jo

     {
  method: "GET",
  path: "/assignments/cardcount",
  options: {
    handler: handler.getStudentCount,
    description: "Get all assignments for a student by studentId",
    tags: ["api", "assignment"],
  
    auth: {
      strategies: ["jwt"],
    },
  },
},
//get assignment by ObjectId jo
{
  method: "GET",
  path: "/assignments/{id}",
  options: {
    handler: handler.getByObjectId,
    description: "Get assignment by ObjectId",
    tags: ["api", "assignment"],
    auth: {
      strategies: ["jwt"],
    },
  },
},


   {
      method: "POST",
      path: "/groupAssignments",
      options: {
        handler: handler.createGroupAssignment,
        description: "Create an assignment",
        tags: ["api", "student"],
        payload: {
          output: "stream",
          parse: true,
          maxBytes: 50 * 1024 * 1024,
          multipart: true,
          allow: "multipart/form-data",
        },
        // auth: {
        //   strategies: ["jwt"],
        // },
       },
    },



//jo
{
  method: "PUT",
  path: "/assignments/bulk",
  options: {
    handler: handler.bulkUpdateAssignments,
    description: assignemntMessages.UPDATE_BULK,
    tags: ["api", "assignment"],
    payload: {
      parse: true,
      allow: 'application/json'
    },
    auth: {
      strategies: ["jwt"],
    },
  },
},


    //janani

     {
  method: "GET",
  path: "/assignments/teacher/cardcount",
  options: {
    handler: handler.getTeacherStudentAssignmentCount,
    description: "Get all assignments counts for a student by teacherId",
    tags: ["api", "assignment"],
    auth: {
      strategies: ["jwt"],
    },
  },
     },

  {
  method: "GET",
  path: "/assignments/questionlist",
  options: {
    handler: handler.getAssignmentQuestionList,
    description: "Get all assignments counts for a student by teacherId",
    tags: ["api", "assignment"],
    // auth: {
    //   strategies: ["jwt"],
    // },
  },
     },


  ];
  server.route(routes);
};
export = {
  name: "api-assignment",
  version: "1.0.0",
  register,
};