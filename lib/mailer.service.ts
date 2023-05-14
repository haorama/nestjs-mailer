import { Inject, Injectable } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { Transporter } from "nodemailer";
import { MAILER_MODULE_OPTIONS } from "./constants";
import { MailerModuleOptions, SendMailOptions } from "./interfaces";
import { MailEngineAdapter } from "./mail-view.engine";

@Injectable()
export class MailerService {
  private engine: MailEngineAdapter;
  private transporters: Map<string, Transporter> = new Map();

  constructor(
    @Inject(MAILER_MODULE_OPTIONS) private options: MailerModuleOptions
  ) {
    this.createTransports();
  }

  createTransports() {
    const { mailers, template } = this.options;

    for (const [name, transport] of Object.entries(mailers)) {
      if (typeof transport === "function") {
        this.transporters.set(name, transport());
      } else {
        this.transporters.set(
          name,
          nodemailer.createTransport(transport, this.options.defaults)
        );
      }
    }

    if (template) {
      this.engine = this.options.template.engine;
    }
  }

  send(options: SendMailOptions) {
    const mailer = options.mailer || this.options.default_mailer;
    const transporter = this.transporters.get(mailer);

    if (!!this.engine && !!options.template) {
      options.html = this.engine.render(options.template, options.data);
    }

    return transporter.sendMail({
      from: this.options?.defaults?.from,
      ...options,
    });
  }
}
