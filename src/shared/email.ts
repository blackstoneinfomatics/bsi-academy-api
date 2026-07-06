import axios from "axios";


export const sendEmailClient = async (
  To: { email: string}[],
  Subject: string,
  HTMLPart: string,
  Cc?: { email: string; name: string }[]
) => {
  let emailConfigDetails: any = {
    sender: {
      name: "Blackstone Admin",
      email: "academy@blackstoneinfomatics.com",
    },
    to: To,
    subject: Subject,
    htmlContent: HTMLPart,
  };

  if (Cc?.length) {
    emailConfigDetails.cc = Cc;
  }

  try {

    const { data: res } = await axios.post(
      "https://api.sendinblue.com/v3/smtp/email",
      emailConfigDetails,
      {
        headers: {
          "api-key": process.env.API_KEY,
          "accept": "application/json",
          "content-type": "application/json",
        },
      }
    );
    return res;
  } catch (err) {
    console.log("Err>>>>>", err);
  }
};