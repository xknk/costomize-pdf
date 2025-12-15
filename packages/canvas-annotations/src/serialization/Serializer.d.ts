/**
 * 批注序列化器
 * 支持JSON格式导入导出
 */
import type { Annotation, ExportOptions, ImportOptions } from '../types';
export declare class Serializer {
    /**
     * 导出为JSON
     */
    exportJSON(annotations: Annotation[], options?: ExportOptions): string;
    /**
     * 从JSON导入
     */
    importJSON(json: string, options?: ImportOptions): Annotation[];
}
//# sourceMappingURL=Serializer.d.ts.map