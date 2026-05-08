import { Router, Request, Response } from 'express';
import {
  getDefaultEditorSettings,
  getDefaultEditorSettingsPath,
  getUserEditorSettingsPath,
  readEditorSettings,
  readUserEditorSettings,
  writeUserEditorSettings,
} from '../editorSettings';

export const editorSettingsRoute = Router();

editorSettingsRoute.get('/editor-settings', (_req: Request, res: Response) => {
  res.json({
    success: true,
    defaultPath: getDefaultEditorSettingsPath(),
    userPath: getUserEditorSettingsPath(),
    settings: readEditorSettings(),
    defaults: getDefaultEditorSettings(),
    user: readUserEditorSettings(),
  });
});

editorSettingsRoute.put('/editor-settings', (req: Request, res: Response) => {
  try {
    const user = writeUserEditorSettings(req.body);

    res.json({
      success: true,
      defaultPath: getDefaultEditorSettingsPath(),
      userPath: getUserEditorSettingsPath(),
      settings: readEditorSettings(),
      user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid editor settings payload.',
    });
  }
});
