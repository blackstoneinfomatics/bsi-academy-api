

// get access token from sharepoint

import axios from 'axios';
import * as dotenv from "dotenv";
import qs from "qs";
dotenv.config();

 let tenantId = process.env.TENANT_ID ;
  let clientId = process.env.CLIENT_ID;
  let clientSecret = process.env.CLIENT_SECRET;

export async function getSharePointAccessToken(): Promise<string> {


  console.log("TENANT_ID:", tenantId);
  console.log("CLIENT_ID:", clientId);
  console.log("CLIENT_SECRET:", clientSecret);

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const data = qs.stringify({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret, // NOT ENCODED
    scope: "https://graph.microsoft.com/.default",
  });

  try {
    const response = await axios.post(tokenUrl, data, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    console.log("Access Token:", response.data.access_token);
    return response.data.access_token;

  } catch (err: any) {
    console.log("TOKEN ERROR:", err.response?.data);  // <-- shows real Azure reason
    throw err;
  }
}


//Get site ID from sharepoint
export async function getSharePointSiteId(accessToken: string): Promise<string> {
  const siteDomain = process.env.SITE_DOMAIN;
  const siteName = process.env.SITE_NAME; 
    const url = `https://graph.microsoft.com/v1.0/sites/${siteDomain}:/sites/${siteName}`;
    const response = await axios.get(url, { 
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    console.log('SharePoint Site ID:', response.data.id);
    return response.data.id;
}

//Get Drive ID from sharepoint document library
export async function getSharePointDriveId(accessToken: string, siteId: string): Promise<string> {
    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives`;
    const response = await axios.get(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    const driveId = response.data.value[0].id;
    console.log('SharePoint Drive ID:', driveId);
    return driveId;
}



export async function uploadFileToSharePoint(
  fileBuffer: Buffer,
  fileName: string
): Promise<{ fileId: string; driveId: string; name: string; webUrl: string }> {
  const token = await getSharePointAccessToken();
  const siteId = await getSharePointSiteId(token);
  const driveId = await getSharePointDriveId(token, siteId);

 // const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root:/${fileName}:/content`;
  const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:/WebApplication/PDF/${fileName}:/content`;

  const response = await axios.put(uploadUrl, fileBuffer, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
    },
  });

  const itemId = response.data.id;
  console.log('Uploaded File Item ID:', itemId);
  return {
    fileId: response.data.id as string,
    driveId: response.data.parentReference.driveId as string,
    name: response.data.name as string,
    webUrl: response.data.webUrl as string, // SharePoint UI link
  };
}

//view file

export async function viewFileFromSharePoint(fileId: string) {
  const token = await getSharePointAccessToken();
  const siteId = await getSharePointSiteId(token);
  const driveId = await getSharePointDriveId(token, siteId);

  const fileUrl =
    `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/content`;

  const response = await axios.get(fileUrl, {
  responseType: "arraybuffer",   // <— MUST BE THIS
  headers: { Authorization: `Bearer ${token}` }
});

return {
  buffer: Buffer.from(response.data),
  contentType: response.headers["content-type"],
  contentLength: response.headers["content-length"],
};
}

// export async function viewFileFromSharePoint(fileId: string) {
//   try {
//    const token = await getSharePointAccessToken();
//   const siteId = await getSharePointSiteId(token);
//   const driveId = await getSharePointDriveId(token, siteId);

//   // 1. Get file metadata
//   const metadata = await axios.get(
//     `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}`,
//     {
//       headers: { Authorization: `Bearer ${token}` },
//     }
//   );

//   // 2. Extract temporary view link
//   const viewUrl = metadata.data["@microsoft.graph.downloadUrl"];

//   return viewUrl; // <--- this is what you send to frontend
//   } catch (error) { 
//     console.error("Error viewing file from SharePoint:", error);
//     throw error;
//   }
  
// }



// export async function viewFileFromSharePoint(fileId: string) {
//   try {
//   const token = await getSharePointAccessToken();
//     const siteId = await getSharePointSiteId(token);

//  const driveId = await getSharePointDriveId(token, siteId);
//   const fileUrl =
//     `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${fileId}/content`;

//   const response = await axios.get(fileUrl, {
//     responseType: "stream",
//     headers: { Authorization: `Bearer ${token}` },
//   });
// //console.log('File Content-Type:', response);
//   return {
//     stream: response.data,
//     contentType: response.headers["content-type"],
//   };
// } catch (error) {
//     console.error("Error viewing file from SharePoint:", error);
//     throw error;
//   }
// }



//get sharable link (view)
async function getShareableLink(accessToken: string, driveId: string, siteId: string, itemId: string): Promise<string> {
    const url = `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/items/${itemId}/createLink`;
    const response = await axios.post(url, {    
        type: 'view',
        scope: 'organization',
    }, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
    });
    const shareableLink = response.data.link.webUrl;
    console.log('Shareable Link:', shareableLink);
    return shareableLink;
}

