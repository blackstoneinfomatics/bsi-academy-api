import { Request, ResponseToolkit } from '@hapi/hapi';
import UserModel from "../../models/users"
import  getallsettinglist, { getrolesettingById, updateUserAccess } from "../../operations/roleaccess"
import { IAccessModel } from '../../../types/models.types';
import roleacces from '../../models/roleacces'

export default{

  //Update the role access

  async updateroleAccessById(req: Request, h: ResponseToolkit) {
    try {
      const rawPayload = req.payload as Partial<IAccessModel>;
      const { _id } = req.params; // Get the employee ID from the URL parameter
  
      // Find the user by their ID
      const user = await UserModel.findById(_id);
      if (!user) {
        return h.response({ message: 'User not found' }).code(404);
      }
  
      // Prepare the updated access payload
      const accessPayload: Partial<IAccessModel> = {
        employeeId: user._id.toString(),
        employeeName: user.userName || '',
        contact: user.email || '',
        designation: Array.isArray(user.role) ? user.role : [user.role],
        dateOfJoining: user.createdDate || new Date(),
  
        roleAccess: {
          admin: rawPayload.roleAccess?.admin || false,
          adminmodules: {
            dashboard: { read: rawPayload.roleAccess?.adminmodules?.dashboard?.read || false, write: rawPayload.roleAccess?.adminmodules?.dashboard?.write || false, delete: rawPayload.roleAccess?.adminmodules?.dashboard?.delete || false },
            evaluation: { read: rawPayload.roleAccess?.adminmodules?.evaluation?.read || false, write: rawPayload.roleAccess?.adminmodules?.evaluation?.write || false, delete: rawPayload.roleAccess?.adminmodules?.evaluation?.delete || false },
            students: { read: rawPayload.roleAccess?.adminmodules?.students?.read || false, write: rawPayload.roleAccess?.adminmodules?.students?.write || false, delete: rawPayload.roleAccess?.adminmodules?.students?.delete || false },
            employees: { read: rawPayload.roleAccess?.adminmodules?.employees?.read || false, write: rawPayload.roleAccess?.adminmodules?.employees?.write || false, delete: rawPayload.roleAccess?.adminmodules?.employees?.delete || false },
            meetings: { read: rawPayload.roleAccess?.adminmodules?.employees?.read || false, write: rawPayload.roleAccess?.adminmodules?.employees?.write || false, delete: rawPayload.roleAccess?.adminmodules?.employees?.delete || false },
            courses: { read: rawPayload.roleAccess?.adminmodules?.courses?.read || false, write: rawPayload.roleAccess?.adminmodules?.courses?.write || false, delete: rawPayload.roleAccess?.adminmodules?.courses?.delete || false },
            classes: { read: rawPayload.roleAccess?.adminmodules?.classes?.read || false, write: rawPayload.roleAccess?.adminmodules?.classes?.write || false, delete: rawPayload.roleAccess?.adminmodules?.classes?.delete || false },
            finance: { read: rawPayload.roleAccess?.adminmodules?.finance?.read || false, write: rawPayload.roleAccess?.adminmodules?.finance?.write || false, delete: rawPayload.roleAccess?.adminmodules?.finance?.delete || false },
            analytics: { read: rawPayload.roleAccess?.adminmodules?.analytics?.read || false, write: rawPayload.roleAccess?.adminmodules?.analytics?.write || false, delete: rawPayload.roleAccess?.adminmodules?.analytics?.delete || false },
            messages: { read: rawPayload.roleAccess?.adminmodules?.messages?.read || false, write: rawPayload.roleAccess?.adminmodules?.messages?.write || false, delete: rawPayload.roleAccess?.adminmodules?.messages?.delete || false },
            settings: { read: rawPayload.roleAccess?.adminmodules?.settings?.read || false, write: rawPayload.roleAccess?.adminmodules?.settings?.write || false, delete: rawPayload.roleAccess?.adminmodules?.settings?.delete || false },
          },
          academicCoach: rawPayload.roleAccess?.academicCoach || false,
          academicmodules: {
            dashboard: { read: rawPayload.roleAccess?.academicmodules?.dashboard?.read || false, write: rawPayload.roleAccess?.academicmodules?.dashboard?.write || false, delete: rawPayload.roleAccess?.academicmodules?.dashboard?.delete || false },
            trialmanagement: { read: rawPayload.roleAccess?.academicmodules?.trialmanagement?.read || false, write: rawPayload.roleAccess?.academicmodules?.trialmanagement?.write || false, delete: rawPayload.roleAccess?.academicmodules?.trialmanagement?.delete || false },
            schedule: { read: rawPayload.roleAccess?.academicmodules?.schedule?.read || false, write: rawPayload.roleAccess?.academicmodules?.schedule?.write || false, delete: rawPayload.roleAccess?.academicmodules?.schedule?.delete || false },
            managestudents: { read: rawPayload.roleAccess?.academicmodules?.managestudents?.read || false, write: rawPayload.roleAccess?.academicmodules?.managestudents?.write || false, delete: rawPayload.roleAccess?.academicmodules?.managestudents?.delete || false },
            manageteachers: { read: rawPayload.roleAccess?.academicmodules?.manageteachers?.read || false, write: rawPayload.roleAccess?.academicmodules?.manageteachers?.write || false, delete: rawPayload.roleAccess?.academicmodules?.manageteachers?.delete || false },
            messages: { read: rawPayload.roleAccess?.academicmodules?.messages?.read || false, write: rawPayload.roleAccess?.academicmodules?.messages?.write || false, delete: rawPayload.roleAccess?.academicmodules?.messages?.delete || false },
            support: { read: rawPayload.roleAccess?.academicmodules?.support?.read || false, write: rawPayload.roleAccess?.academicmodules?.support?.write || false, delete: rawPayload.roleAccess?.academicmodules?.support?.delete || false },
          },
          supervisor: rawPayload.roleAccess?.supervisor || false,
          supervisormodules: {
            dashboard: { read: rawPayload.roleAccess?.supervisormodules?.dashboard?.read || false, write: rawPayload.roleAccess?.supervisormodules?.dashboard?.write || false, delete: rawPayload.roleAccess?.supervisormodules?.dashboard?.delete || false },
            recruitment: { read: rawPayload.roleAccess?.supervisormodules?.recruitment?.read || false, write: rawPayload.roleAccess?.supervisormodules?.recruitment?.write || false, delete: rawPayload.roleAccess?.supervisormodules?.recruitment?.delete || false },
            meetingandtraining: { read: rawPayload.roleAccess?.supervisormodules?.meetingandtraining?.read || false, write: rawPayload.roleAccess?.supervisormodules?.meetingandtraining?.write || false, delete: rawPayload.roleAccess?.supervisormodules?.meetingandtraining?.delete || false },
            teachers: { read: rawPayload.roleAccess?.supervisormodules?.teachers?.read || false, write: rawPayload.roleAccess?.supervisormodules?.teachers?.write || false, delete: rawPayload.roleAccess?.supervisormodules?.teachers?.delete || false },
            messages: { read: rawPayload.roleAccess?.supervisormodules?.messages?.read || false, write: rawPayload.roleAccess?.supervisormodules?.messages?.write || false, delete: rawPayload.roleAccess?.supervisormodules?.messages?.delete || false },
            support: { read: rawPayload.roleAccess?.supervisormodules?.support?.read || false, write: rawPayload.roleAccess?.supervisormodules?.support?.write || false, delete: rawPayload.roleAccess?.supervisormodules?.support?.delete || false },
          },
          student: rawPayload.roleAccess?.student || false,
          studentmodules: {
            dashboard: { read: rawPayload.roleAccess?.studentmodules?.dashboard?.read || false, write: rawPayload.roleAccess?.studentmodules?.dashboard?.write || false, delete: rawPayload.roleAccess?.studentmodules?.dashboard?.delete || false },
            classes: { read: rawPayload.roleAccess?.studentmodules?.classes?.read || false, write: rawPayload.roleAccess?.studentmodules?.classes?.write || false, delete: rawPayload.roleAccess?.studentmodules?.classes?.delete || false },
            assignments: { read: rawPayload.roleAccess?.studentmodules?.assignments?.read || false, write: rawPayload.roleAccess?.studentmodules?.assignments?.write || false, delete: rawPayload.roleAccess?.studentmodules?.assignments?.delete || false },
            payments: { read: rawPayload.roleAccess?.studentmodules?.payments?.read || false, write: rawPayload.roleAccess?.studentmodules?.payments?.write || false, delete: rawPayload.roleAccess?.studentmodules?.payments?.delete || false },
            knowledgebase: { read: rawPayload.roleAccess?.studentmodules?.knowledgebase?.read || false, write: rawPayload.roleAccess?.studentmodules?.knowledgebase?.write || false, delete: rawPayload.roleAccess?.studentmodules?.knowledgebase?.delete || false },
            messages: { read: rawPayload.roleAccess?.studentmodules?.knowledgebase?.read || false, write: rawPayload.roleAccess?.studentmodules?.knowledgebase?.write || false, delete: rawPayload.roleAccess?.studentmodules?.knowledgebase?.delete || false },
           support: { read: rawPayload.roleAccess?.studentmodules?.support?.read || false, write: rawPayload.roleAccess?.studentmodules?.support?.write || false, delete: rawPayload.roleAccess?.studentmodules?.support?.delete || false }, // typo preserved
          },
          teacher: rawPayload.roleAccess?.teacher || false,
          teachermodules: {
            dashboard: { read: rawPayload.roleAccess?.teachermodules?.dashboard?.read || false, write: rawPayload.roleAccess?.teachermodules?.dashboard?.write || false, delete: rawPayload.roleAccess?.teachermodules?.dashboard?.delete || false },
            meeting: { read: rawPayload.roleAccess?.teachermodules?.meeting?.read || false, write: rawPayload.roleAccess?.teachermodules?.meeting?.write || false, delete: rawPayload.roleAccess?.teachermodules?.meeting?.delete || false },
            schedule: { read: rawPayload.roleAccess?.teachermodules?.schedule?.read || false, write: rawPayload.roleAccess?.teachermodules?.schedule?.write || false, delete: rawPayload.roleAccess?.teachermodules?.schedule?.delete || false },
            liveclass: { read: rawPayload.roleAccess?.teachermodules?.liveclass?.read || false, write: rawPayload.roleAccess?.teachermodules?.liveclass?.write || false, delete: rawPayload.roleAccess?.teachermodules?.liveclass?.delete || false },
            assignment: { read: rawPayload.roleAccess?.teachermodules?.assignment?.read || false, write: rawPayload.roleAccess?.teachermodules?.assignment?.write || false, delete: rawPayload.roleAccess?.teachermodules?.assignment?.delete || false },
            messages: { read: rawPayload.roleAccess?.teachermodules?.messages?.read || false, write: rawPayload.roleAccess?.teachermodules?.messages?.write || false, delete: rawPayload.roleAccess?.teachermodules?.messages?.delete || false },
            analytics: { read: rawPayload.roleAccess?.teachermodules?.analytics?.read || false, write: rawPayload.roleAccess?.teachermodules?.analytics?.write || false, delete: rawPayload.roleAccess?.teachermodules?.analytics?.delete || false },
            support: { read: rawPayload.roleAccess?.teachermodules?.support?.read || false, write: rawPayload.roleAccess?.teachermodules?.support?.write || false, delete: rawPayload.roleAccess?.teachermodules?.support?.delete || false },
          },
        },
        
  
        status: rawPayload.status ?? 'active',
        createdDate: user.createdDate || new Date(),
        createdBy: rawPayload.createdBy ?? 'system',
        updatedDate: new Date(),
        updatedBy: rawPayload.updatedBy ?? 'system',
      };
  
      // Check if the access record for this user already exists
      let roleAccess = await roleacces.findOne({ employeeId: user._id.toString() });
  
      if (roleAccess) {
        // If the record exists, update it
        roleAccess = await roleacces.findOneAndUpdate(
          { employeeId: user._id.toString() },  // Match by employeeId
          accessPayload,  // Update the record with the new payload
          { new: true }  // Return the updated document
        );
      } else {
        // If the record doesn't exist, create a new one
        roleAccess = new roleacces(accessPayload);
        await roleAccess.save();
      }
  
      return h.response({
        message: 'Access assigned successfully',
        user,
        roleAccess,
      }).code(200);
  
    } catch (error) {
      console.error(error);
      return h.response({ message: 'Internal Server Error' }).code(500);
    }
  },



   //getlist for Employeelist
    
   async getsettinglist(req: Request, h: ResponseToolkit) {
    try {
      const { employeeName, designation, fromDate, toDate } = req.query;
  
      const result = await getallsettinglist({ employeeName, designation, fromDate, toDate });
  
      return h.response({
        status: 'success',
        data: result,
      }).code(200);
    } catch (error) {
      console.error(error);
      return h.response({ message: 'Internal Server Error' }).code(500);
    }
  },
  
  //get by ID

  async getsettingById(req: Request, h: ResponseToolkit) {
    try {
      const settingId = req.params.id;
  
      if (!settingId) {
        return h.response({ success: false, message: "ID is required" }).code(400);
      }
  
      const { settings } = await getrolesettingById(settingId);
  
      if (!settings) {
        return h.response({ success: false, message: "Setting not found" }).code(404);
      }
  
      return h.response({
        success: true,
        data: settings,
      }).code(200);
    } catch (error: any) {
      return h.response({
        success: false,
        message: error.message ?? "Failed to fetch settings",
      }).code(500);
    }
  },}