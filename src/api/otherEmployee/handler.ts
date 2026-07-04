import { ResponseToolkit,Request } from "@hapi/hapi";
import { z } from "zod";
import otheremployee, { zodOtherEmployeeSchema } from "../../models/otheremployee";
import { getOhterEmpCountriesCount, getOhterEmployeeById, saveOtherEmployee, UpdateOtherEmployee } from "../../operations/otheremployee";
import * as Stream from "stream";
import { isNil } from "lodash";
import { notFound } from "@hapi/boom";
import { recruitmentMessages } from "../../config/messages";
import { Readable } from "stream";



const createEmployeeInputValidation = z.object({
  payload: zodOtherEmployeeSchema.pick({
    firstName: true,
    lastName: true,
    email: true,
    phoneNumber: true,
    nationality: true,
    country: true,
    city: true,
    dateOfBirth: true,
    gender: true,
    residentialAddress: true,
    higherQualification: true,
    universityName: true,
    previousJob: true,
    experience: true,
    bankName: true,
    accountNumber: true,
    bankCode: true,
    passportNumber: true,
    languagesKnown: true,
    emergencyContactNumber: true,
    relationshipWithEmployee: true,
    address: true,
    designation: true,
    department: true,
    preferedWorkingHours: true,
    preferedShiftFrom: true,
    preferedShiftTo: true,
    comments: true,
    profileImage: true,
    applicationDate: true,
    currency: true,
    expectedSalary: true,
    applicationStatus: true,
    preferedWorkingDays: true,
    status: true
  }),
});




export default {
   async createOtherEmployee (req: Request, h: ResponseToolkit){
        const { payload } = createEmployeeInputValidation.parse({
              payload: req.payload,
            });

            const rawPayload = req.payload as any;
    
            const uploadFileBuffer = rawPayload.uploadResume
            ? await streamToBuffer(rawPayload.uploadResume)
            : null;

            return await saveOtherEmployee({  
            firstName : payload.firstName,
            lastName: payload.lastName,
            email: payload.email,
            phoneNumber: payload.phoneNumber,
            nationality: payload.nationality,
            country: payload.country,
            city: payload.city,
            dateOfBirth: payload.dateOfBirth,
            gender: payload.gender,
            residentialAddress: payload.residentialAddress,
            higherQualification: payload.higherQualification,
            universityName: payload.universityName,
            previousJob: payload.previousJob,
            experience: payload.experience,
            bankName: payload.bankName,
            accountNumber:payload.accountNumber,
            bankCode: payload.bankCode,
            passportNumber: payload.passportNumber,
            languagesKnown: payload.languagesKnown,
            emergencyContactNumber: payload.emergencyContactNumber,
            relationshipWithEmployee: payload.relationshipWithEmployee,
            address: payload.address,
            designation: payload.designation,
            department: payload.department,
            preferedWorkingHours: payload.preferedWorkingHours,
            preferedShiftFrom: payload.preferedShiftFrom,
            preferedShiftTo: payload.preferedShiftTo,
            comments: payload.comments,
            profileImage: payload.profileImage || " ",
            applicationDate: payload.applicationDate,
            currency: payload.currency,
            expectedSalary: payload.expectedSalary,
            applicationStatus: payload.applicationStatus,
            preferedWorkingDays: payload.preferedWorkingDays,
            resume: uploadFileBuffer ? uploadFileBuffer : undefined ,
            status: payload.status
          }) 
     },
     async getOhterEmpCountries(req: Request, h: ResponseToolkit){
      return await getOhterEmpCountriesCount();
    },

       async getOhterEmpById(req: Request, h: ResponseToolkit){
          const result = await getOhterEmployeeById(String(req.params.id));
    
          if (isNil(result)) {
               return notFound(recruitmentMessages.USER_NOT_FOUND);
               }
    
      return result;
        },
 

async updateOtherEmployee(req: Request, h: ResponseToolkit) {
  const _id = req.params._id;

  const { payload } = createEmployeeInputValidation.parse({
    payload: req.payload,
  });

 const updateData = {
  firstName: payload.firstName,
  lastName: payload.lastName,
  designation: payload.designation,
  email: payload.email,
  phoneNumber: payload.phoneNumber,
  dateOfBirth: payload.dateOfBirth,
  country: payload.country,
  city: payload.city,
  residentialAddress: payload.residentialAddress,
  higherQualification: payload.higherQualification,
  universityName: payload.universityName,
  languagesKnown: payload.languagesKnown,
  experience: payload.experience ? String(payload.experience) : undefined,
  passportNumber: payload.passportNumber,
  bankName: payload.bankName,
  accountNumber: payload.accountNumber,
  bankCode: payload.bankCode,
};

  Object.keys(updateData).forEach((key) => {
    const typedKey = key as keyof typeof updateData;
    if (updateData[typedKey] === undefined) {
      delete updateData[typedKey];
    }
  });

  const updatedEmployee = await UpdateOtherEmployee(_id, updateData);

  if (!updatedEmployee) return { error: "Employee not found" };

  return updatedEmployee;
}



}
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: any[] = [];

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: any) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    );
    stream.on("error", (err: any) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });



  
}

