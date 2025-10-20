export function addToLocalStorage(key: string, value: string) {
    if (typeof window !== 'undefined') {
        const existing = localStorage.getItem(key);
        const values = existing ? JSON.parse(existing) : [];
        if (!values.includes(value)) {
            values.push(value);
            localStorage.setItem(key, JSON.stringify(values));
        }
    }
}

export function getFromLocalStorage(key: string): string[] {
    if (typeof window !== 'undefined') {
        const existing = localStorage.getItem(key);
        return existing ? JSON.parse(existing) : [];
    }
    return [];
}


export function removeFromLocalStorage(key: string, value: string) {
    if (typeof window !== 'undefined') {
        const existing = localStorage.getItem(key);
        if (existing) {
            const values = JSON.parse(existing);
            const updatedValues = values.filter((v: string) => v !== value);
            localStorage.setItem(key, JSON.stringify(updatedValues));
        }
    }
}

export function clearLocalStorage(key: string) {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
    }
}
