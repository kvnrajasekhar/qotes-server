const nodemailer = require("../config/nodemailer");

// sends mail to the user
exports.forgotPasswordLink = async (userMail, link) => {
    console.log("inside forgot mailer", link);
    const logoUrl = "https://lh3.googleusercontent.com/u/0/d/1UJxanHMEJRrR-9sSgoZHawGGPaRBfqu5=w1920-h1080-iv1"; 

    nodemailer.transporter.sendMail(
        {
            from: "'Attention!' <securityteam@qotes.com>",
            to: userMail,
            subject: "Forgot Password - reset link",
            html: `
                    <div style="
                      background-color: #f4f4f4;
                      padding: 40px 20px;
                      font-family: Arial, Helvetica, sans-serif;
                    ">
                      <div style="
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        border-radius: 10px;
                        box-shadow: 0 8px 20px rgba(0,0,0,0.08);
                        padding: 30px;
                        ">
                    <!-- Logo -->
                    <div style="text-align: center; margin-bottom: 20px;">
                      <img src="${logoUrl}" alt="qotes Logo" style="width: 60px; height: auto;">
                    </div>

                    <!-- Heading -->
                    <h2 style="
                      text-align: center;
                      color: #333333;
                      margin-bottom: 10px;
                    ">
                      Reset Your Password
                    </h2>

                    <!-- Description -->
                    <p style="
                      text-align: center;
                      color: #555555;
                      font-size: 14px;
                      line-height: 1.6;
                      margin-bottom: 25px;
                    ">
                      We received a request to reset your password for your qotes account.
                      Click the button below to create a new password.
                    </p>

                    <!-- Button -->
                    <div style="text-align: center;">
                      <a href="${link}" style="
                        display: inline-block;
                        padding: 12px 26px;
                        background-color: #000000;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 6px;
                        font-size: 14px;
                        font-weight: bold;
                      ">
                        Reset Password
                      </a>
                    </div>

                    <!-- Fallback Link -->
                    <p style="
                      margin-top: 25px;
                      font-size: 12px;
                      color: #777777;
                      text-align: center;
                      line-height: 1.5;
                    ">
                      If the button doesn’t work, copy and paste this link into your browser:
                      <br>
                      <span style="word-break: break-all; color: #e63946;">
                        ${link}
                      </span>
                    </p>

                    <hr style="
                      border: none;
                      border-top: 1px solid #eeeeee;
                      margin: 30px 0;
                    ">

                    <!-- Security Note -->
                    <p style="
                      text-align: center;
                      font-size: 12px;
                      color: #999999;
                      line-height: 1.6;
                    ">
                      This password reset link is valid for a limited time.
                      If you did not request a password reset, please ignore this email.
                    </p>

                    <!-- Footer -->
                    <p style="
                      text-align: center;
                      font-size: 12px;
                      color: #aaaaaa;
                      margin-top: 15px;
                    ">
                      — qotes Security Team
                    </p>
                </div>
            </div>
        `,
        },
        (err, info) => {
            if (err) {
                console.log("Error in sending mail", err);
                return;
            }
            console.log("Message sent", info);
            return;
        }
    );
};


exports.resetPasswordLink = async (userMail, link) => {
    console.log("inside reset mailer", link);
    const logoUrl = "https://drive.google.com/uc?export=view&id=1gGK8HO3o9gSBL9DWrApIlf3xV3w-CLJU"; 

    nodemailer.transporter.sendMail(
        {
            from: "'Attention!' <securityteam@qotes.com>",
            to: userMail,
            subject: "Reset Password - reset link",
            html: `
                    <div style="
                      background-color: #f4f4f4;
                      padding: 40px 20px;
                      font-family: Arial, Helvetica, sans-serif;
                    ">
                      <div style="
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #ffffff;
                        border-radius: 10px;
                        box-shadow: 0 8px 20px rgba(0,0,0,0.08);
                        padding: 30px;
                        ">
                                        <!-- Logo -->
                    <div style="text-align: center; margin-bottom: 20px;">
                      <img src="${logoUrl}" alt="qotes Logo" style="width: 140px; height: auto;">
                    </div>

                    <!-- Heading -->
                    <h2 style="
                      text-align: center;
                      color: #333333;
                      margin-bottom: 10px;
                    ">
                      Reset Your Password
                    </h2>

                    <!-- Description -->
                    <p style="
                      text-align: center;
                      color: #555555;
                      font-size: 14px;
                      line-height: 1.6;
                      margin-bottom: 25px;
                    ">
                      We received a request to reset your password for your qotes account.
                      Click the button below to create a new password.
                    </p>

                    <!-- Button -->
                    <div style="text-align: center;">
                      <a href="${link}" style="
                        display: inline-block;
                        padding: 12px 26px;
                        background-color: #e63946;
                        color: #ffffff;
                        text-decoration: none;
                        border-radius: 6px;
                        font-size: 14px;
                        font-weight: bold;
                      ">
                        Reset Password
                      </a>
                    </div>

                    <!-- Fallback Link -->
                    <p style="
                      margin-top: 25px;
                      font-size: 12px;
                      color: #777777;
                      text-align: center;
                      line-height: 1.5;
                    ">
                      If the button doesn’t work, copy and paste this link into your browser:
                      <br>
                      <span style="word-break: break-all; color: #e63946;">
                        ${link}
                      </span>
                    </p>

                    <hr style="
                      border: none;
                      border-top: 1px solid #eeeeee;
                      margin: 30px 0;
                    ">

                    <!-- Security Note -->
                    <p style="
                      text-align: center;
                      font-size: 12px;
                      color: #999999;
                      line-height: 1.6;
                    ">
                      This password reset link is valid for a limited time.
                      If you did not request a password reset, please ignore this email.
                    </p>

                    <!-- Footer -->
                    <p style="
                      text-align: center;
                      font-size: 12px;
                      color: #aaaaaa;
                      margin-top: 15px;
                    ">
                      — qotes Security Team
                    </p>
                </div>
            </div>
        `,
        },
        (err, info) => {
            if (err) {
                console.log("Error in sending mail", err);
                return;
            }
            console.log("Message sent", info);
            return;
        }
    );
};





