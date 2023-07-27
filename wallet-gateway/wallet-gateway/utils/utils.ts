export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export const decodeBody = (base64String: string) => {
    console.log('decoding body...');
    // const decodedBody = Buffer.from(base64String, 'base64').toString('utf-8');
    return JSON.parse(base64String);
};
export const encodeBody = (obj: any) => {
    const encodedBody = Buffer.from(JSON.stringify(obj)).toString('base64');
    console.log(encodedBody); // Outputs: eyJ0ZXN0IjoiYm9keSJ9
    return encodedBody;
};

export function findUndefinedProperties(obj: any, path = '') {
    for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
            findUndefinedProperties(obj[key], `${path}${key}.`);
        } else if (obj[key] === undefined) {
            console.log(`Undefined property: ${path}${key}`);
        }
    }
}

export function isWithin24HoursAgo(date: Date) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return date >= oneDayAgo;
}
