export abstract class MailEngineAdapter {
  root: string;
  abstract render(path: string, data?: Record<string, any>): any;
}
