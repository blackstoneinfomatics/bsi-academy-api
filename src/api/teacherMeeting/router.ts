import { Server, ServerRoute } from '@hapi/hapi';
import { addMeetingMessages, evaluationMessages } from '../../config/messages'
import handler from './handler';

const register = async (server:Server): Promise <void> => {
    const routes: ServerRoute[] = [
        {   
            method: 'POST',
            path:'/teacherMeeting',
            options: {
                handler: handler.createTeacherMeeting,
                description:addMeetingMessages.CREATE,
                tags: ['api', 'teacherMeeting'],
                                auth: {
        strategies: ["jwt"],
      },
            },
        },


{
  method: 'GET',
  path: '/teacherMeeting',
  options: {
    handler: handler.getTeacherMeetingsByMeetingId,
    description: 'Get meetings by meetingId',
    tags: ['api', 'teacherMeeting'],
    auth: {
      strategies: ['jwt'],
    },
  },
},




{
  method: "GET",
  path: "/teacherMeetinglist", 
  options: {
    handler: handler.getallTeachermeeting,
    description: evaluationMessages.LIST,
    tags: ["api", "teacherMeetinglist"],
    auth: {
      strategies: ["jwt"],
    },
  },
},

{
  method: "GET",
  path: "/StudentMeetinglist", 
  options: {
    handler: handler.getStudentIdMeeting,
    description: evaluationMessages.LIST,
    tags: ["api", "teacherMeetinglist"],
    auth: {
      strategies: ["jwt"],
    },
  },
},

  
    {   
        method: 'PUT',
        path:'/updateTeacherMeeting/{meetingId}',
        options: {
            handler: handler.updateTeacherMeeting,
            description:addMeetingMessages.CREATE,
            tags: ['api', 'teacherMeeting'],
                            auth: {
        strategies: ["jwt"],
      },
        },
    },


{
  method: "PUT",
  path: "/meetingattendence/{meetingbyId}",
  options: {
    handler: handler.updateTeacherMeetingAttendee,
    description: addMeetingMessages.LIST,
    tags: ["api", "teacherMeeting"],
    payload: {
      parse: true,
      allow: "application/json"
    }
  }
}


    ];
    server.route(routes);
}; 





export = {
    name: "api-teacherMeeting",
    register,
  };