import { PDFDocument } from "pdf-lib";

export const useSave = () => {
    const save = (fabricCanvasObj: any) => {
        let fabricJsonObj: any = {}
        for (let key in fabricCanvasObj) {
            const jsonObj = fabricCanvasObj[key].toJSON();
            if (jsonObj.objects.length > 0) {
                fabricJsonObj[key] = jsonObj
            }
        }
        return fabricJsonObj
    }
    const down = async (pdfUrl: string, fabricCanvasObj: any) => {
        const response = await fetch(pdfUrl);
        const pdfData = await response.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfData);
        const pages = pdfDoc.getPages();
        for (let key in fabricCanvasObj) {
            const jsonObj = fabricCanvasObj[key].toJSON();
            if (jsonObj.objects.length > 0) {
                const dataURL = fabricCanvasObj[key].toDataURL({
                    format: 'png',
                    quality: 1
                });
                const currentPageIndex: number = parseInt(key.split("_")[1], 10);
                const page = pages[currentPageIndex];
                const annotImage = await pdfDoc.embedPng(dataURL);
                // 获取页面尺寸
                const { width, height } = page.getSize();
                // 在页面上绘制批注
                page.drawImage(annotImage, {
                    x: 0,
                    y: 0,
                    width: width,
                    height: height,
                    opacity: 1,
                });
            }
        }
        const modifiedPdfBytes = await pdfDoc.save();
        const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        return url
    }
    return {
        save,
        down
    }
}