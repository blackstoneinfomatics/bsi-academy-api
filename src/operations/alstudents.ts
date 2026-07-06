
import { isNil } from "lodash";
import { IAlStudentCreate, IAlStudents } from "../../types/models.types";
import { alstudentsMessages, commonMessages } from "../config/messages";
import { GetAllRecordsParams } from "../shared/enum";
import AppLogger from "../helpers/logging";
import AlStudentsModel from "../models/alstudents"; // Ensure proper model import
import { Types } from "mongoose";
import  ClassScheduleModel  from "../models/classShedule"
import Evaluation from "../models/evaluation"; 
import alstudents from "../models/alstudents";
import StudentModel from "../models/student";
import evaluation from "../models/evaluation";

export const getAllalstudentsList = async (
  params: GetAllRecordsParams
): Promise<{
  totalCount: number;
  students: any[];
}> => {

  const { studentId,academicCoachId, searchText, sortBy, sortOrder, offset, limit, filterValues } = params;
 console.log("Params received in getAllalstudentsList:", params);
  const query: any = {};

  // 🔍 Search text filter
  if (searchText) {
    query.$or = [
      { name: { $regex: searchText, $options: "i" } },
      { email: { $regex: searchText, $options: "i" } },
    ];
  }

  // 🔍 Filter by studentId
  if (studentId) {
    query["student.studentId"] = Array.isArray(studentId)
      ? { $in: studentId }
      : studentId;
  }
  

  // 🔍 Additional Filter values
  if (filterValues) {
    if (filterValues.course) query.course = { $in: filterValues.course };
    if (filterValues.country) query.country = { $in: filterValues.country };
    if (filterValues.teacher) query.teacher = { $in: filterValues.teacher };
    if (filterValues.status) query.status = { $in: filterValues.status };
  }

  console.log("Constructed Query:", JSON.stringify(query, null, 2));

  // Sorting
  const sortOptions: any = {
    [sortBy]: sortOrder === "asc" ? 1 : -1,
  };
const academicCoachStudentIds = academicCoachId
  ? await evaluation.distinct(
      'student.studentId',
      { academicCoachId }
    )
  : [];
  console.log("Academic Coach Student IDs:", academicCoachStudentIds);

if (academicCoachStudentIds.length) {
 query["student.studentId"] = { $in: academicCoachStudentIds };
}
   console.log("Final Query after Academic Coach Filter:", JSON.stringify(query, null, 2));
  const studentQuery = AlStudentsModel.find(query).sort(sortOptions);

  // Pagination
  if (!isNil(offset) && !isNil(limit)) {
    const skip = Math.max(
      0,
      ((Number(offset) ?? 1) - 1) * (Number(limit) ?? 10)
    );
    studentQuery.skip(skip).limit(Number(limit) ?? 10);
  }
   
 
  // Fetch students and total count
  const [students, totalCount] = await Promise.all([
    studentQuery.exec(),
    AlStudentsModel.countDocuments(query).exec(),
  ]);

  // 🔥 Add referralId, classSchedule, teacher details, evaluation
  const studentsWithExtras = await Promise.all(
    students.map(async (student) => {

      // ClassSchedule Count
      const classScheduleCount = await ClassScheduleModel.countDocuments({
        "student.id": student._id.toString(),
      });

      // Latest ClassSchedule
      const classSchedule = await ClassScheduleModel.findOne(
        { "student.id": student._id.toString() },
        { "teacher.teacherName": 1, sessionClassType: 1 }
      )
        .sort({ _id: -1 })
        .lean();

      // Evaluation
      const evaluations = await Evaluation.find({
        "student.studentId": student.student.studentId,
      })
        .lean()
        .exec();

      // ⭐ Fetch referralId from Student model
 
const mainStudent = await StudentModel.findOne(
  { studentId: student?.student?.studentId },
  { refernceId: 1 }
).lean();


// 2. Save that refernceId into AlStudentsModel
if (mainStudent?.refernceId) {
  await AlStudentsModel.updateOne(
    { "student.studentId": student?.student?.studentId },
    { $set: { refernceId: mainStudent.refernceId } }
  );
}

const referralId = mainStudent?.refernceId || null;

      return {
        ...student.toObject(),
        classScheduleCount,
        teacherName: classSchedule?.teacher?.teacherName || "",
        sessionClassType: classSchedule?.sessionClassType || "",
        evaluation: evaluations,
        referralId, // ⭐ Added referral ID here
      };
    })
  );

  AppLogger.info(alstudentsMessages.GET_ALL_LIST_SUCCESS, {
    totalCount,
  });

  return {
    totalCount,
    students: studentsWithExtras,
  };
};



export const getalstudentsById = async (studentId: string): Promise<IAlStudents | null> => {
  if (!studentId) {
    console.log("Invalid student ID: ID is missing or undefined");
    return null;
  }

  console.log(`Searching for student with studentId: ${studentId}`);

  try {
    // Query using student.studentId
    const student = await AlStudentsModel.findOne({
      _id: studentId,
    }).lean();
const studentDetails = student as unknown as IAlStudents;
    console.log("Fetched student details:", student);
    return studentDetails;
  } catch (error) {
    console.error("Error fetching student by studentId:", error);
    return null;
  }
};

  
  /**
 * Retrieves all user records for a given tenant, with support for search, pagination, sorting, role filtering, and excluding passwords.
 *
 *  @param {Partial<{ id: string; username: string; role: string }>}  query - The parameters for fetching user records, including role filtering.
 *
 * @returns {Promise<IStudent | null>} - A promise that resolves to an object containing:
 *  - `users`: An array of user records for the given tenant, with passwords excluded.
 *  - `totalCount`: The total number of user records matching the query.
 */
 export const getActiveStudentRecord = async (
   query: Partial<{ id: string; username: string; role: string }>
 ): Promise<IAlStudents | null> => {
   const { id, username, role } = query;
 
   const dbQuery: any = {
     status: "Active",
   };
 
   if (!isNil(id)) dbQuery._id = new Types.ObjectId(id);
   if (!isNil(username)) dbQuery.username = username;
   if (!isNil(role)) dbQuery.role = role;
 
   const result = await AlStudentsModel.findOne(dbQuery).lean();
   console.log("result>>",result);

   return AlStudentsModel.findOne(dbQuery).lean() as unknown as IAlStudents | null;
 };

  /**
 * Creates a new user.
 *
 * @param {IAlStudentCreate} payload - The data of the user to be created.
 */
 export const createAlStudent = async (
   payload: IAlStudentCreate
 ): Promise<IAlStudents | null> => {
   const newStudent = new AlStudentsModel(payload);
   const specialChars = '@#$%&*!';
    const randomNum = Math.floor(Math.random() * 1000); // Random number between 0-999
    const randomSpecial = specialChars[Math.floor(Math.random() * specialChars.length)]; // Random special character
  
    // Generate password
    const firstThreeChars = newStudent.username.substring(0, 3); // First 3 characters of the username
    const reversedUsername = newStudent.username.split('').reverse().join(''); // Reverse the username
  
    const studentPassword = `${firstThreeChars}${randomSpecial}${randomNum}${reversedUsername}`;
   newStudent.password = studentPassword

   const savedUser = await newStudent.save();

   return savedUser
 };


 

 export const getStudentRecordCount = async()=>{
 
   const alfStudentCount= await AlStudentsModel.aggregate([
     {
       $group: {
         _id: null,
         studentTotalCount: { $sum: 1 },
         activeStudent: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
         inActiveStudent: { $sum: { $cond: [{ $eq: ["$status", "InActive"] }, 1, 0] } },
         onHoldStudent: { $sum: { $cond: [{ $eq: ["$studentStatus", "HOLD"] }, 1, 0] } },
         studentOnBreak: { $sum: { $cond: [{ $eq: ["$studentStatus", "BREAKING"] }, 1, 0] } } 
       },
     },
     {
       $sort: { count: -1 }, // Optional: sort descending
     },
   ]);
   
   return  alfStudentCount ;
   
 };


 export const getStudentPercentage = async() =>{
     const studentTotalCount= await AlStudentsModel.aggregate([
      
       {
        $group: {
          _id: null,
          studentCount: { $sum: 1 },
          studentMaleCount: { $sum: { $cond: [{ $eq: ["$student.gender", "Male"] }, 1, 0] } },
          studentFemaleCount: { $sum: { $cond: [{ $eq: ["$student.gender", "Female"] }, 1, 0] } },
        },
      },
      ]);
      const studentPercentage = studentTotalCount[0].studentCount;
      const studentMalePercentage = ((studentTotalCount[0].studentMaleCount/ studentTotalCount[0].studentCount)*100).toFixed(2);
      const studentFemalePercentage = ((studentTotalCount[0].studentFemaleCount/ studentTotalCount[0].studentCount)*100).toFixed(2);
      
      return {studentPercentage, studentMalePercentage, studentFemalePercentage};
 };


export const getStudentCountriesCount = async() =>{

  const studentCountByCountry = await AlStudentsModel.aggregate([
    {
      $match: {
        status: "Active", // Optional filter
      },
    },
    {
      $group: {
        _id: "$student.country",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 }, // Optional: sort descending
    },
  ]);
  
  const studentCount = await AlStudentsModel.countDocuments({
    status: "Active",
  }).exec();
  
  const results: any[] = [];
  
  for (const studentCountry of studentCountByCountry) {
    let studentCountryPercentage = ((studentCountry.count / studentCount) * 100).toFixed(2);
    results.push({
      country: studentCountry._id,
      count: studentCountry.count,
      percentage: parseFloat(studentCountryPercentage),
    });
  }
  
  
  return { studentCount, studentCountByCountry: results };

};



export const getStudentlevel = async (studentId: string) => {
  const now = new Date();
  const firstDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const studentLevelData = await AlStudentsModel.aggregate([
    {
      $match: {
        status: "Active",
        createdDate: {
          $gte: firstDayOfPreviousMonth,
          $lt: firstDayOfCurrentMonth,
        },
        _id: new Types.ObjectId(studentId),
      },
    },
    {
      $project: {
        _id: 0,
        studentId: "$_id",
        level: "$level",
        monthLabel: {
          $dateToString: {
            format: "%b %Y", // "Jun 2025"
            date: "$createdDate"
          }
        }
      }
    }
  ]);

  return {
    studentCount: studentLevelData.length,
    studentCountByLevel: studentLevelData,
    fromDate: firstDayOfPreviousMonth.toISOString().split("T")[0],
    toDate: firstDayOfCurrentMonth.toISOString().split("T")[0],
  };
};

export const updateStudent = async (studentData: any) => {
  try {
    const { _id, profilepic, ...updateFields } = studentData;

    // Make sure _id exists
    if (!_id) throw new Error("Student ID (_id) is required for update.");

    const updatedStudent = await alstudents.findByIdAndUpdate(
      _id,
      { $set: { ...updateFields, profilepic } }, // include profilepic
      { new: true } // return the updated document
    );

    return updatedStudent;
  } catch (error: any) {
    console.error("Error updating student:", error);
    throw new Error(error.message);
  }
};




