// TypeScript 防抖函数
export const debounce = <F extends (...args: any[]) => any>(func: F, delay: number): ((...args: Parameters<F>) => void) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>) => {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
};