import { ResponseToolkit, Request } from "@hapi/hapi";
import { z } from "zod";
import getAllknowledge, { createKnowledgeBase } from "../../operations/knowledgeBase";
import { zodknowledgeBaseValidationSchema } from "../../models/knowledgebase";
import { uploadFileToSharePoint } from "../../shared/sharepoint";
import { Readable } from "stream";

const createInputValidation = z.object({
  payload: zodknowledgeBaseValidationSchema.pick({
    courseName: true,
    subjectTitle: true,
    uploadedFormat: true,
    uploadedFile: true,
    status: true,
    createdDate: true,
    createdBy: true,
    updatedBy: true,
    updatedDate: true,
  }),
});

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
export default {


  async createKnowledgeBase(req: Request, h: ResponseToolkit) {
    try {
      const { payload } = createInputValidation.parse({ payload: req.payload });
          const rawPayload = req.payload as any;
let uploadFileBuffer: Buffer | null = null;

if (rawPayload.uploadedFile) {

  // CASE 1: Hapi gives buffer inside _data
  if (rawPayload.uploadedFile._data) {
    uploadFileBuffer = rawPayload.uploadedFile._data;
  }
  // CASE 2: Already a Buffer
  else if (Buffer.isBuffer(rawPayload.uploadedFile)) {
    uploadFileBuffer = rawPayload.uploadedFile;
  }
  // CASE 3: Base64 string
  else if (typeof rawPayload.uploadedFile === "string") {
    uploadFileBuffer = Buffer.from(rawPayload.uploadedFile, "base64");
  }
  else {
    throw new Error("Invalid file format received");
  }
}

    const fileName = `${Date.now()}_knowledgebase_file`;
    const shareLink = await uploadFileToSharePoint(
          uploadFileBuffer  as Buffer,
          fileName
        );

      const knowledgebase = await createKnowledgeBase({
        courseName: payload.courseName,
        subjectTitle: payload.subjectTitle,
        uploadedFormat: payload.uploadedFormat,
        uploadedFile: shareLink.fileId || '', // now guaranteed to be Buffer or null
        status: payload.status ?? '',
        createdDate: payload.createdDate || new Date(),
        createdBy: payload.createdBy ?? '',
        updatedBy: payload.updatedBy ?? '',
        updatedDate: payload.updatedDate || new Date(),
      });

      if ("error" in knowledgebase) {
        return h.response({ error: knowledgebase.error }).code(400);
      }

      return h.response({ message: "KnowledgeBase created successfully", data: knowledgebase }).code(201);

    } catch (error) {
      console.error(error);
      return h.response({ error: "Something went wrong" }).code(400);
    }
  },

//list knowledgebase

async getknowledgebaseList(req: Request, h: ResponseToolkit) {
  try {
    const result = await getAllknowledge();  // No filters passed
    
    return h.response({
      status: 'success',
      data: result,
    }).code(200);
  } catch (error) {
    console.error(error);
    return h.response({ message: 'Internal Server Error' }).code(500);
  }
}


};





