import * as SMTPConnection from "nodemailer/lib/smtp-connection";
import * as SMTPTransport from "nodemailer/lib/smtp-transport";
import { MailEngineAdapter } from "../mail-view.engine";
import { ModuleMetadata, Type } from "@nestjs/common";

export interface MailTemplateOptions {
  engine: MailEngineAdapter;
}

export type MailerTransport = (() => any) | SMTPConnection.Options;

export interface MailerModuleOptions {
  default_mailer: string;
  defaults?: SMTPTransport.Options;
  template?: MailTemplateOptions;
  mailers: {
    [key: string]: MailerTransport | Record<string, any>;
  };
}

export interface MailerOptionsFactory {
  createMailerOptions(): Promise<MailerModuleOptions> | MailerModuleOptions;
}

export interface MailerModuleAsyncOptions
  extends Pick<ModuleMetadata, "imports"> {
  useExisting?: Type<MailerOptionsFactory>;
  useClass?: Type<MailerOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<MailerModuleOptions> | MailerModuleOptions;
  inject?: any[];
}
