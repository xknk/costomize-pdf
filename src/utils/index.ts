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

// TypeScript 节流函数
export const throttle = <F extends (...args: any[]) => any>(func: F, delay: number): ((...args: Parameters<F>) => void) => {
    let lastCall = 0;
    return (...args: Parameters<F>) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func.apply(this, args);
        }
    };
};