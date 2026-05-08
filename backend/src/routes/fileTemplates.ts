import { Router, Request, Response } from 'express';
import {
  getScratchpadTemplatePath,
  getUntitledTemplatePath,
  readScratchpadTemplate,
  readUntitledTemplate,
} from '../fileTemplates';

export const fileTemplatesRoute = Router();

fileTemplatesRoute.get('/templates/untitled-file', (_req: Request, res: Response) => {
  res.json({
    success: true,
    path: getUntitledTemplatePath(),
    template: readUntitledTemplate(),
  });
});

fileTemplatesRoute.get('/templates/scratchpad', (_req: Request, res: Response) => {
  res.json({
    success: true,
    path: getScratchpadTemplatePath(),
    template: readScratchpadTemplate(),
  });
});
