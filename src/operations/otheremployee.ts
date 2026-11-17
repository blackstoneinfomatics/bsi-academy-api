import { IOtherEmployee, IOtherEmployeeCreate } from "../../types/models.types"
import IOtherEmployeeModel, { generateOtherEmployeeId } from "../models/otheremployee"
import User from "../models/users"
import ShiftSchedule from "../models/usershiftschedule"
import OtherEmpModel from "../models/otheremployee"
import { Types } from "mongoose"
import SalaryAndWages from "../models/empwages";
import EmailTemplate from "../models/emailTemplate";
import { sendEmailClient } from "../shared/email";
import { hashPassword } from "../shared/common";

/**
 * Creates a new user.
 *
 * @param {IOtherEmployeeCreate} payload - The data of the user to be created.
 */
export const saveOtherEmployee = async (payload: IOtherEmployeeCreate): Promise<IOtherEmployee | { error: any }> => {

const otherempdetails = {} as IOtherEmployee;

otherempdetails.preferedWorkingHours =  payload.preferedWorkingHours;
const preffredToTime = (payload.preferedShiftFrom) + otherempdetails.preferedWorkingHours;
otherempdetails.preferedShiftTo = preffredToTime;

         const emailTemplate = await EmailTemplate.findOne({
           templateKey: "otherEmployee_portal",
           status: "Active",
         }).exec();

         if (!emailTemplate) {
           throw new Error(
             'Active Other Employee Portal email template not found (templateKey: "otherEmployee_portal")',
           );
         }

         const existingEmployee = await IOtherEmployeeModel.findOne({
           tenantId: payload.tenantId,
           email: payload.email,
         }).exec();
         let savedOtherEmployee = existingEmployee;
         if (!savedOtherEmployee) {
           const employeeId = await generateOtherEmployeeId(payload.designation);
           savedOtherEmployee = await new IOtherEmployeeModel({
             ...payload,
             employeeId,
           }).save();
         } else if (!savedOtherEmployee.employeeId) {
           savedOtherEmployee.employeeId = await generateOtherEmployeeId(
             savedOtherEmployee.designation,
           );
           await savedOtherEmployee.save();
         }

         if (!savedOtherEmployee.employeeId) {
           throw new Error("Employee ID was not assigned");
         }
         const employeeId = savedOtherEmployee.employeeId;

         if (!existingEmployee) {
           const salaryRecords = [
             {
               employeeName: `${savedOtherEmployee.firstName} ${savedOtherEmployee.lastName}`,
               employeeId,
               classType: {
                 className: "FIXEDSALARY",
                 hoursMins: "1 month",
                 rate: 10,
                 currency: "$",
               },
               status: "Active",
               createdDate: new Date(),
               createdBy: "Admin",
               updatedDate: new Date(),
               updatedBy: "Admin",
             },
           ];

           try {
             await SalaryAndWages.insertMany(salaryRecords);
             console.log("Salary and wage records inserted successfully.");
           } catch (error) {
             console.error("Error inserting salary and wage records:", error);
           }
         }

         const saveUser = await createTeacherPortalPortal(
           savedOtherEmployee,
           emailTemplate.templateContent,
         );
         await createShiftSchedule(savedOtherEmployee, saveUser);

          return savedOtherEmployee;

}

export const getOhterEmpCountriesCount = async() =>{

  const otherEmpCountByCountry = await OtherEmpModel.aggregate([
    {
      $match: {
        status: "Active", // Optional filter
      },
    },
    {
      $group: {
        _id: "$country",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 }, // Optional: sort descending
    },
  ]);
  
  const otherEmployeeCount = await OtherEmpModel.countDocuments({
    status: "Active",
  }).exec();
  
  const results: any[] = [];
  
  for (const studentCountry of otherEmpCountByCountry) {
    let otherEmpCountryPercentage = ((studentCountry.count / otherEmployeeCount) * 100).toFixed(2);
    results.push({
      country: studentCountry._id,
      count: studentCountry.count,
      percentage: parseFloat(otherEmpCountryPercentage),
    });
  }
  
  
  return { otherEmployeeCount, otherEmpCountByCountry: results };

};



export const UpdateOtherEmployee = async (
  employeeId: string,
  payload: Partial<IOtherEmployee>
) => {
  try {
    const filter = Types.ObjectId.isValid(employeeId)
      ? {
          $or: [
            { _id: new Types.ObjectId(employeeId) },
            { employeeId },
          ],
        }
      : { employeeId };
    const updatedEmployee = await IOtherEmployeeModel.findOneAndUpdate(
      filter,
      payload,
      { new: true }
    );

    if (!updatedEmployee) {
      return { error: "Employee not found" };
    }

    return updatedEmployee;
  } catch (err) {
    return { error: err };
  }
};





 async function createTeacherPortalPortal(updateData: any, templateContent: string) {
    const specialChars = '@#$%&*!';
    const randomNum = Math.floor(Math.random() * 1000); // Random number between 0-999
    const randomSpecial = specialChars[Math.floor(Math.random() * specialChars.length)]; // Random special character
  
    // Generate password
    const firstThreeChars = updateData.firstName.substring(0, 3); // First 3 characters of the username
    const reversedUsername = updateData.firstName.split('').reverse().join(''); // Reverse the username
  
    const password = `${firstThreeChars}${randomSpecial}${randomNum}${reversedUsername}`;
    const hashedPassword = await hashPassword(password);
  const saveStudent = await User.create({
    tenantId: updateData.tenantId,
    userId: updateData.employeeId,
    userName: updateData.firstName,
    email:updateData.email,
    password: hashedPassword,
    profileImage: null,
    role: updateData.designation,
    gender: updateData.gender,
    country: updateData.country,
    status: "Active",
    createdBy: "Admin",
    createdDate: new Date,
    lastUpdatedBy: "Admin" ,   
    updatedDate: new Date
  }
   );

  const htmlPart = templateContent
    .replace(/<username>/g, saveStudent.userName)
    .replace(/<password>/g, password);
  const mailResponse = await sendEmailClient(
    [{ email: saveStudent.email }],
    "Welcome To Alfurqan Team",
    htmlPart
  );
  if (!mailResponse) {
    throw new Error(`Failed to send employee portal email to ${saveStudent.email}`);
  }

  return saveStudent;
};
async function createShiftSchedule(saveOtherEmployee:any, saveUser: any) {


  const startDate = new Date();
  
  // Create end date by cloning the start date and adding 30 days
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 30);
  let createShift = await ShiftSchedule.create({
        tenantId: saveOtherEmployee.tenantId,
        academicCoachId : saveOtherEmployee.designation == "ACADEMICCOACH" ? saveUser.userId : null,
        teacherId : null,
        supervisorId: saveOtherEmployee.designation == "SUPERVISOR" ? saveUser.userId : null,
        employeeId: saveOtherEmployee.employeeId,
        name: saveUser.userName,
        email: saveUser.email,
        role: saveUser.role[0],
        workhrs: saveOtherEmployee.preferedWorkingHours,
        startdate: startDate,
        enddate : endDate, 
        fromtime: saveOtherEmployee.preferedShiftFrom,
        totime: saveOtherEmployee.preferedShiftTo,
        createdDate: new Date(),
        createdBy: "Admin",
        lastUpdatedBy: "Admin"
    }
     );
     console.log("createShift", createShift);
     await createShift.save();
     
  console.log("Student portal",saveOtherEmployee )
};

export const getOhterEmployeeById = async (
  id: string
): Promise<IOtherEmployee | null> => {
  const filter = Types.ObjectId.isValid(id)
    ? {
        $or: [
          { _id: new Types.ObjectId(id) },
          { employeeId: id },
        ],
      }
    : { employeeId: id };

  return IOtherEmployeeModel.findOne(filter).lean();
};