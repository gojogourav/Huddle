import { Response } from "express"
import { Resend } from "resend"
import { ratelimiterEmail } from "./utils"
const resend = new Resend(process.env.RESEND_API_KEY)

export const emailTemplate = (otp: string) => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Hubble Login Verification</title>
    <style>
        /* Basic Reset */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; font-family: Arial, sans-serif; }

        /* Centering */
        .container {
            padding: 20px;
            background-color: #f4f4f7; /* Light grey background */
        }
        .content {
            background-color: #ffffff; /* White content area */
            padding: 30px;
            border-radius: 8px;
            max-width: 600px;
            margin: 0 auto;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        /* Typography */
        h1 {
            color: #333333;
            font-size: 24px;
            font-weight: bold;
            margin-top: 0;
            margin-bottom: 15px;
        }
        p {
            color: #555555;
            font-size: 16px;
            line-height: 1.5;
            margin-bottom: 20px;
        }
        .otp-code {
            font-size: 36px;
            font-weight: bold;
            color: #2a7ae2; /* Hubble-like blue, adjust if needed */
            letter-spacing: 5px; /* Spreads out the digits */
            margin: 25px 0;
            padding: 15px;
            background-color: #eef4fc; /* Light blue background for emphasis */
            border-radius: 6px;
            display: inline-block; /* Keeps background tight to text */
        }
        .footer p {
            font-size: 12px;
            color: #888888;
            margin-top: 30px;
        }
        .footer a {
            color: #2a7ae2;
            text-decoration: none;
        }

        /* Button-like Link (Optional - if you need a link) */
        .button {
          display: inline-block;
          padding: 12px 25px;
          font-size: 16px;
          font-weight: bold;
          color: #ffffff;
          background-color: #2a7ae2;
          border-radius: 5px;
          text-decoration: none;
          margin-top: 15px;
        }

        /* Responsive */
        @media screen and (max-width: 600px) {
            .content { padding: 20px; }
            h1 { font-size: 20px; }
            p { font-size: 14px; }
            .otp-code { font-size: 28px; letter-spacing: 3px; padding: 10px; }
        }
    </style>
</head>
<body style="margin: 0 !important; padding: 0 !important; background-color: #f4f4f7;">
    <!-- Visually Hidden Preheader Text : Helps with email client preview text -->
    <div style="display: none; font-size: 1px; color: #f4f4f7; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        Your Hubble verification code is here.
    </div>

    <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td align="center" class="container" style="padding: 20px; background-color: #f4f4f7;">
                <!--[if (gte mso 9)|(IE)]>
                <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
                <tr>
                <td align="center" valign="top" width="600">
                <![endif]-->
                <div class="content" style="background-color: #ffffff; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; text-align: center; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                    <!-- Optional: Add Hubble Logo Here -->
                    <!-- <img src="YOUR_LOGO_URL" alt="Hubble Logo" width="150" style="margin-bottom: 20px;"> -->

                    <h1 style="color: #333333; font-size: 24px; font-weight: bold; margin-top: 0; margin-bottom: 15px;">Hubble Login Verification</h1>

                    <p style="color: #555555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                        Hi there,
                    </p>
                    <p style="color: #555555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                        Please use the following One-Time Password (OTP) to complete your login process for Hubble.
                    </p>

                    <div class="otp-code" style="font-size: 36px; font-weight: bold; color: #2a7ae2; letter-spacing: 5px; margin: 25px 0; padding: 15px; background-color: #eef4fc; border-radius: 6px; display: inline-block;">
                        ${otp}
                    </div>

                    <p style="color: #555555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                        This code is valid for 10 minutes. Please do not share this code with anyone.
                    </p>

                    <p style="color: #555555; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                        If you did not request this code, you can safely ignore this email.
                    </p>

                    <!-- Optional Button Example -->
                    <!-- <a href="YOUR_LOGIN_PAGE_URL" class="button" style="display: inline-block; padding: 12px 25px; font-size: 16px; font-weight: bold; color: #ffffff; background-color: #2a7ae2; border-radius: 5px; text-decoration: none; margin-top: 15px;">Go to Login</a> -->

                    <div class="footer" style="margin-top: 30px;">
                        <p style="font-size: 12px; color: #888888; margin-bottom: 5px;">
                           © ${new Date().getFullYear()} Hubble. All rights reserved.
                        </p>
                         <!-- Optional: Add Contact/Support Link -->
                        <!-- <p style="font-size: 12px; color: #888888; margin-bottom: 20px;">
                           Need help? <a href="YOUR_SUPPORT_URL" style="color: #2a7ae2; text-decoration: none;">Contact Support</a>
                        </p> -->
                    </div>
                </div>
                <!--[if (gte mso 9)|(IE)]>
                </td>
                </tr>
                </table>
                <![endif]-->
            </td>
        </tr>
    </table>
</body>
</html>`
}

export const sendResendEmail = async (otp: string, email: string,res:Response)=> {
    try{
        const { data, error } = await resend.emails.send({
            from: 'Acme <onboarding@resend.dev>',
            to: [`${email}`],
            subject: 'Your Hubble Login Code: ${otp}`',
            html: emailTemplate(`${otp}`),
        });
        if (error) {
            console.error('Resend Error:', error);
            res.status(500).json({ message: 'Failed to send OTP email. Please try again later.' });
            throw new Error(`Resend API Error: ${error.message || 'Unknown error'}`);

        }
        try{
            ratelimiterEmail.consume(email)
        }catch(err){
            res.status(500).json({message:"please wait few moments before continuing"})
            return;
        }

    }catch(error){
        console.error("Failed to send email");
        res.status(500).json({message:"Failed to send email"});
        throw error;
    }
}

