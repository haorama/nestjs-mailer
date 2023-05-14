import { MailOptions } from "nodemailer/lib/sendmail-transport";

export interface SendMailOptions extends MailOptions {
  template?: string;
  data?: Record<string, any>;
  // if not set, will use the default transport
  mailer?: string;
}
