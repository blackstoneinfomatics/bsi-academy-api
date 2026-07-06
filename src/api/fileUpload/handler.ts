
import { ResponseToolkit, Request } from "@hapi/hapi";
import { viewFileFromSharePoint } from "../../shared/sharepoint";


function getExt(mime: string) {
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("image")) return "jpg";
  return "file";
}
export default {

 async viewFileFromSharePoint(req: Request, h: ResponseToolkit) {
  const { fileId } = req.params;
  const file = await viewFileFromSharePoint(fileId);

  return h
    .response(file.buffer)
    .header("Content-Type", "application/pdf")
    .header("Content-Length", String(file.contentLength || file.buffer.length))
    .header("Content-Disposition", `inline; filename="preview.${getExt(String(file.contentType))}"`)
    .header("Access-Control-Allow-Origin", "*")
    .header("Cross-Origin-Resource-Policy", "cross-origin");
}


}