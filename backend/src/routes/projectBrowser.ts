import { Request, Response, Router } from 'express';
import {
  listProjectDirectories,
  readProjectTree,
  writeProjectFile,
} from '../projectBrowser';

export const projectBrowserRoute = Router();

projectBrowserRoute.get('/project-browser', (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      ...listProjectDirectories(typeof req.query.path === 'string' ? req.query.path : undefined),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to browse directories.',
    });
  }
});

projectBrowserRoute.get('/project-tree', (req: Request, res: Response) => {
  try {
    if (typeof req.query.path !== 'string' || !req.query.path.trim()) {
      res.status(400).json({
        success: false,
        error: 'path query parameter is required.',
      });
      return;
    }

    res.json({
      success: true,
      ...readProjectTree(req.query.path),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read project tree.',
    });
  }
});

projectBrowserRoute.put('/project-file', (req: Request, res: Response) => {
  const filePath = typeof req.body?.path === 'string' ? req.body.path.trim() : '';
  const content = typeof req.body?.content === 'string' ? req.body.content : '';

  if (!filePath) {
    res.status(400).json({
      success: false,
      error: 'path is required.',
    });
    return;
  }

  try {
    writeProjectFile(filePath, content);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save project file.',
    });
  }
});
