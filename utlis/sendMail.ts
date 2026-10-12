require('dotenv').config();
import nodemailer ,{Transporter, SendMailOptions} from 'nodemailer';
import ejs from 'ejs';
import path from 'path';



interface EmailOptions{
    email:string;
    subject:string;
    template:string;
    data: {[key:string]:any};
    attachments?: SendMailOptions['attachments'];
}

const sendMail = async(options : EmailOptions): Promise <void> =>{
    const transporter: Transporter= nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        service: process.env.SMTP_SERVICE,
        auth:{
            user: process.env.SMTP_MAIL,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    const {email,subject,template,data,attachments} = options;

    const html:string = template;

    const mailOptions = {
        from: `"GDG on campus HIT" <${process.env.SMTP_MAIL}>`,
        to:email,
        subject,
        html,
        attachments
    };

    await transporter.sendMail(mailOptions);
}

export default sendMail;