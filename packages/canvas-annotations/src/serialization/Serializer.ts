/**
 * 批注序列化器
 * 支持JSON格式导入导出
 */

import type { Annotation, ExportOptions, ImportOptions } from '../types';
import { validateAnnotation } from '../models/Annotation';

export class Serializer {
  /**
   * 导出为JSON
   */
  exportJSON(
    annotations: Annotation[],
    options: ExportOptions = {}
  ): string {
    const data = {
      version: '1.0.0',
      metadata: options.includeMetadata
        ? {
            exportedAt: new Date().toISOString(),
            totalCount: annotations.length
          }
        : undefined,
      annotations
    };

    return options.pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
  }

  /**
   * 从JSON导入
   */
  importJSON(
    json: string,
    options: ImportOptions = {}
  ): Annotation[] {
    try {
      const data = JSON.parse(json);

      if (!data.annotations || !Array.isArray(data.annotations)) {
        throw new Error('Invalid JSON format: missing annotations array');
      }

      const annotations: Annotation[] = [];

      for (const anno of data.annotations) {
        if (options.validate && !validateAnnotation(anno)) {
          console.warn('Invalid annotation skipped:', anno);
          continue;
        }

        annotations.push(anno);
      }

      return annotations;
    } catch (error) {
      console.error('Failed to import JSON:', error);
      throw error;
    }
  }
}
